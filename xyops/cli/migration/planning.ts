import { createVoiceflowEnvelopeSchema } from "../schemas/voiceflow-envelope";
import { MigrationPlanSchema } from "../schemas/migration-results";
import { requireEnvelopeResult } from "../validation";
import type { MigrationPlan, MigrationSelection } from "../types";
import { planParameters } from "../state";
import type { MigrationContext } from "./selection";

type ReadMigrationPlan = (
  context: MigrationContext,
  selection: MigrationSelection,
) => Promise<MigrationPlan>;
export const readMigrationPlan: ReadMigrationPlan = (
  { client, config },
  selection,
) =>
  client
    .readEvent(
      config.events.planMigration,
      planParameters(selection),
      createVoiceflowEnvelopeSchema(MigrationPlanSchema),
    )
    .then((response) =>
      requireEnvelopeResult(
        response,
        "plan_migration",
        createVoiceflowEnvelopeSchema(MigrationPlanSchema),
      ),
    );
