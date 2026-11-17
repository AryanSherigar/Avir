import rawInterventions from "../../../data/interventions.json";
import { HouseholdProfile } from "../schemas/household";
import { InterventionRule, InterventionRuleSchema } from "../schemas/interventions";

const catalogue: InterventionRule[] = rawInterventions.map((item) =>
  InterventionRuleSchema.parse(item)
);

export function getInterventionCatalogue(): InterventionRule[] {
  return catalogue;
}

export function getInterventionById(id: string): InterventionRule | undefined {
  return catalogue.find((item) => item.id === id);
}

function matchesActivityPrerequisite(
  requiresActivityTypes: InterventionRule["prerequisites"]["requiresActivityTypes"],
  profile: HouseholdProfile
): boolean {
  if (!requiresActivityTypes || requiresActivityTypes.length === 0) {
    return true;
  }
  return profile.activities.some((a) => requiresActivityTypes.includes(a.type));
}

function matchesTransportPrerequisite(
  applicableTransport: InterventionRule["prerequisites"]["applicableTransport"],
  profile: HouseholdProfile
): boolean {
  if (!applicableTransport || applicableTransport.length === 0) {
    return true;
  }
  return profile.activities.some(
    (a) => a.transportMode && applicableTransport.includes(a.transportMode)
  );
}

function matchesFuelPrerequisite(
  applicableCookingFuel: InterventionRule["prerequisites"]["applicableCookingFuel"],
  profile: HouseholdProfile
): boolean {
  if (!applicableCookingFuel || applicableCookingFuel.length === 0) {
    return true;
  }
  return applicableCookingFuel.includes(profile.home.cookingFuel);
}

function matchesPurifierPrerequisite(
  prerequisites: InterventionRule["prerequisites"],
  profile: HouseholdProfile
): boolean {
  if (prerequisites.requiresNoPurifier === true && profile.home.hasAirPurifier) {
    return false;
  }
  if (prerequisites.requiresPurifier === true && !profile.home.hasAirPurifier) {
    return false;
  }
  return true;
}

export function isInterventionApplicable(
  rule: InterventionRule,
  profile: HouseholdProfile
): boolean {
  const { prerequisites } = rule;

  if (!matchesActivityPrerequisite(prerequisites.requiresActivityTypes, profile)) {
    return false;
  }

  if (!matchesTransportPrerequisite(prerequisites.applicableTransport, profile)) {
    return false;
  }

  if (!matchesFuelPrerequisite(prerequisites.applicableCookingFuel, profile)) {
    return false;
  }

  if (prerequisites.requiresIncenseUse === true && !profile.home.usesIncenseOrCoils) {
    return false;
  }

  return matchesPurifierPrerequisite(prerequisites, profile);
}

export function getApplicableInterventions(profile: HouseholdProfile): InterventionRule[] {
  return catalogue.filter((rule) => isInterventionApplicable(rule, profile));
}
