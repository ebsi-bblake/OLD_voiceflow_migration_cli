import { isMigrationPlan, isVoiceflowEnvelope } from "../guards";
import { requireEnvelopeResult } from "../validation";
import type { MigrationPlan, MigrationSelection } from "../types";
import { planParameters } from "../state";
import type { MigrationContext } from "./selection";

type ReadMigrationPlan = (
  context: MigrationContext,
  selection: MigrationSelection,
) => Promise<MigrationPlan>;
export const readMigrationPlan: ReadMigrationPlan = ({ client, config }, selection) =>
  client
    .readEvent(
      config.events.planMigration,
      planParameters(selection),
      isVoiceflowEnvelope(isMigrationPlan),
    )
    .then((response) =>
      requireEnvelopeResult(response, "plan_migration", isMigrationPlan),
    );
