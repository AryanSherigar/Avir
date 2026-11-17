import { GoogleGenAI, Content, FunctionDeclaration, FunctionCall } from "@google/genai";
import { HouseholdProfile } from "../schemas/household";
import { EnvironmentalContext } from "../schemas/air";
import { EvaluatedIntervention } from "../schemas/simulation";
import { HouseholdExposureResult } from "../exposure/calculate";
import {
  PlanExplanation,
  PlanExplanationSchema,
  ChatRequest,
  ChatResponse,
  ChatTurn,
} from "../schemas/ai";
import {
  getPlanSystemInstruction,
  getChatSystemInstruction,
  formatPlanPrompt,
  sanitizeUserMessage,
} from "./prompts";
import {
  generateDeterministicPlanExplanation,
  generateDeterministicChatResponse,
} from "./fallback";
import { createChatToolExecutor, CHAT_TOOL_DECLARATIONS } from "./tools";

const TIMEOUT_MS = 8000;

function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

function parsePlanExplanationJson(rawText: string): PlanExplanation {
  const cleaned = rawText.trim().replace(/^```json\s*|^```\s*|```$/g, "").trim();
  const parsed = PlanExplanationSchema.safeParse(JSON.parse(cleaned));
  if (!parsed.success) {
    throw new Error(`Plan schema validation failed: ${parsed.error.message}`);
  }
  return parsed.data;
}

function createTimeoutPromise(ms: number): { promise: Promise<never>; cancel: () => void } {
  let timer: NodeJS.Timeout;
  const promise = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Gemini plan synthesis timed out (>${ms}ms)`)),
      ms
    );
  });
  return { promise, cancel: () => clearTimeout(timer) };
}

async function executePlanGeneration(
  apiKey: string,
  profile: HouseholdProfile,
  baseline: HouseholdExposureResult,
  evaluated: EvaluatedIntervention[],
  context: EnvironmentalContext,
  lang: "en" | "hi"
): Promise<PlanExplanation> {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = formatPlanPrompt(profile, baseline, evaluated, context, lang);
  const systemInstruction = getPlanSystemInstruction(lang);

  const callPromise = ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const { promise: timeoutPromise, cancel } = createTimeoutPromise(TIMEOUT_MS);
  try {
    const response = await Promise.race([callPromise, timeoutPromise]);
    return parsePlanExplanationJson(response.text ?? "");
  } finally {
    cancel();
  }
}

export async function generatePlanExplanation(
  profile: HouseholdProfile,
  baseline: HouseholdExposureResult,
  evaluated: EvaluatedIntervention[],
  context: EnvironmentalContext
): Promise<{ explanation: PlanExplanation; aiFallback: boolean }> {
  const apiKey = getApiKey();
  const lang = profile.constraints.preferredLanguage;

  if (!apiKey) {
    return {
      explanation: generateDeterministicPlanExplanation(profile, baseline, evaluated, context, lang),
      aiFallback: true,
    };
  }

  try {
    const explanation = await executePlanGeneration(
      apiKey,
      profile,
      baseline,
      evaluated,
      context,
      lang
    );
    return { explanation, aiFallback: false };
  } catch {
    return {
      explanation: generateDeterministicPlanExplanation(profile, baseline, evaluated, context, lang),
      aiFallback: true,
    };
  }
}

function buildInitialChatContents(
  history: ChatTurn[],
  userMessage: string
): Content[] {
  const windowedHistory = history.slice(-10);
  const contents: Content[] = windowedHistory.map((h) => ({
    role: h.role === "user" ? "user" : "model",
    parts: [{ text: h.text }],
  }));
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });
  return contents;
}

async function appendToolTurn(
  call: FunctionCall,
  executeTool: (name: string, args: Record<string, unknown>) => Promise<string>,
  contents: Content[]
): Promise<string> {
  const toolName = call.name ?? "unknown";
  const toolResult = await executeTool(toolName, call.args ?? {});
  contents.push({ role: "model", parts: [{ functionCall: call }] });
  contents.push({
    role: "user",
    parts: [{ functionResponse: { name: toolName, response: { output: toolResult } } }],
  });
  return toolName;
}

async function executeChatLoop(
  ai: GoogleGenAI,
  contents: Content[],
  systemInstruction: string,
  executeTool: (name: string, args: Record<string, unknown>) => Promise<string>
): Promise<ChatResponse> {
  const toolsUsed: string[] = [];
  let turns = 0;

  while (turns < 2) {
    turns++;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: CHAT_TOOL_DECLARATIONS as unknown as FunctionDeclaration[] }],
        temperature: 0.3,
      },
    });

    const call = response.functionCalls?.[0];
    if (!call || !call.name) {
      return {
        response: response.text ?? "Here is our smog recommendation.",
        actionCards: [],
        toolsUsed,
        aiFallback: false,
      };
    }

    const toolName = await appendToolTurn(call, executeTool, contents);
    toolsUsed.push(toolName);
  }

  return {
    response: "Completed schedule analysis with deterministic simulation tools.",
    actionCards: [],
    toolsUsed,
    aiFallback: false,
  };
}

export async function runChatLoop(
  request: ChatRequest,
  context: EnvironmentalContext
): Promise<ChatResponse> {
  const apiKey = getApiKey();
  const lang = request.profile.constraints.preferredLanguage;
  const sanitizedMessage = sanitizeUserMessage(request.message);

  if (!apiKey) {
    return generateDeterministicChatResponse(request.profile, sanitizedMessage, context, lang);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const executeTool = createChatToolExecutor(request.profile, context);
    const systemInstruction = getChatSystemInstruction(lang);
    const contents = buildInitialChatContents(request.history, sanitizedMessage);

    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Gemini chat loop timed out")), TIMEOUT_MS);
    });

    try {
      return await Promise.race([
        executeChatLoop(ai, contents, systemInstruction, executeTool),
        timeoutPromise,
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch {
    return generateDeterministicChatResponse(request.profile, sanitizedMessage, context, lang);
  }
}
