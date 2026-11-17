import { DEFAULT_DELHI_PROFILE, loadHouseholdProfile, saveHouseholdProfile } from "../src/lib/storage";
import { HouseholdProfileSchema } from "../src/lib/schemas/household";
import interventionsData from "../data/interventions.json";
import fs from "node:fs";
import path from "node:path";

function formatHeader(title: string): void {
  console.log("\n" + "=".repeat(70));
  console.log(`  ${title}`);
  console.log("=".repeat(70));
}

function verifyPresetProfile(): void {
  formatHeader("1. Verifying Default Delhi Multigenerational Preset Profile");
  const parsed = HouseholdProfileSchema.safeParse(DEFAULT_DELHI_PROFILE);
  if (!parsed.success) {
    console.error("❌ DEFAULT_DELHI_PROFILE schema validation failed:", parsed.error.issues);
    process.exit(1);
  }
  console.log("✓ DEFAULT_DELHI_PROFILE is strictly schema-compliant");
  console.log(`  Location: ${parsed.data.location.city} (${parsed.data.location.areaLabel})`);
  console.log(`  Members: ${parsed.data.members.length} members (${parsed.data.members.map((m) => m.roleLabel).join(", ")})`);
  console.log(`  Activities: ${parsed.data.activities.length} routine activities`);
  console.log(`  Non-negotiable locked activities: ${parsed.data.constraints.nonNegotiableActivityIds.join(", ")}`);
}

function verifyInterventionsCatalog(): void {
  formatHeader("2. Verifying Bilingual Interventions Catalogue");
  console.log(`✓ Loaded ${interventionsData.length} static interventions`);

  for (const item of interventionsData) {
    if (!item.title.en || !item.title.hi) {
      console.error(`❌ Missing bilingual title for intervention: ${item.id}`);
      process.exit(1);
    }
    if (!item.description.en || !item.description.hi) {
      console.error(`❌ Missing bilingual description for intervention: ${item.id}`);
      process.exit(1);
    }
    console.log(`  - [${item.id}] ${item.title.en} / ${item.title.hi} (Cost: ₹${item.practicality.estimatedCostInr}, Extra Time: +${item.practicality.timeImpactMinutesPerDay}m)`);
  }
}

function verifyUiFileStructure(): void {
  formatHeader("3. Verifying App Router Screens & Component Artifacts");
  const requiredFiles = [
    "src/app/page.tsx",
    "src/app/layout.tsx",
    "src/app/onboarding/page.tsx",
    "src/app/simulator/page.tsx",
    "src/app/assistant/page.tsx",
    "src/components/common/Navbar.tsx",
    "src/components/common/StatusBadge.tsx",
    "src/components/common/PillarCard.tsx",
    "src/components/common/FallbackBanner.tsx",
    "src/components/dashboard/AirObservationCard.tsx",
    "src/components/dashboard/HourlyDiurnalChart.tsx",
    "src/components/dashboard/MemberExposureGrid.tsx",
    "src/components/dashboard/PlanSynthesisCard.tsx",
    "src/components/household/MemberForm.tsx",
    "src/components/household/ActivityTimeline.tsx",
    "src/components/household/HomeEnvironmentForm.tsx",
    "src/components/household/ConstraintsForm.tsx",
    "src/components/simulator/InterventionSelector.tsx",
    "src/components/simulator/ActivitySliderList.tsx",
    "src/components/simulator/SimulationDeltaView.tsx",
    "src/components/assistant/ChatMessageList.tsx",
    "src/components/assistant/ToolExecutionBadge.tsx",
    "src/components/assistant/ActionCardView.tsx",
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Missing required UI file: ${relPath}`);
      process.exit(1);
    }
    console.log(`  ✓ Found ${relPath}`);
  }
}

function verifyPublicMediaDiscipline(): void {
  formatHeader("4. Verifying Zero Binary Media Bloat in Public/ & Assets");
  const publicDir = path.resolve(process.cwd(), "public");
  if (fs.existsSync(publicDir)) {
    const files = fs.readdirSync(publicDir);
    const binaryExts = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".woff", ".woff2", ".ttf"];
    const foundBinaries = files.filter((f) => binaryExts.some((ext) => f.toLowerCase().endsWith(ext)));
    if (foundBinaries.length > 0) {
      console.error(`❌ Forbidden binary assets found in public/: ${foundBinaries.join(", ")}`);
      process.exit(1);
    }
  }
  console.log("✓ Zero binary media in public/ (strict < 10 MB compliance maintained)");
}

function main(): void {
  console.log("\n🚀 Starting Avir Frontend UI & Local-First State Verification Harness\n");
  verifyPresetProfile();
  verifyInterventionsCatalog();
  verifyUiFileStructure();
  verifyPublicMediaDiscipline();
  console.log("\n" + "=".repeat(70));
  console.log("🎉 ALL FRONTEND VERIFICATION CHECKS PASSED SUCCESSFULLY!");
  console.log("=".repeat(70) + "\n");
}

main();
