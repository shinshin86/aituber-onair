import { z } from 'zod';

export const SpreadTypeSchema = z.enum([
  'una_carta',
  'tres_cartas_pasado_presente_futuro',
  'tres_cartas_situacion_obstaculo_consejo',
  'cruz_celta',
  'herradura',
  'triangulo_amor',
  'circulo_celta',
  'tirada_egipcia',
  'estrella_6',
  'arbol_vida',
  'mandala',
  'lenormand_36'
]);

export const TarotToolSchemas = {
  tarot_select_spread: z.object({
    spread_type: SpreadTypeSchema,
    trigger: z.enum(['regalo', 'comando', 'temporizador']),
    gift_type: z.string().optional(),
    viewer_context: z.boolean().default(true)
  }),

  tarot_draw_cards: z.object({
    spread_id: z.string().uuid(),
    reveal_mode: z.enum(['simultaneo', 'secuencial']).default('secuencial'),
    seed: z.number().optional()
  }),

  tarot_get_interpretation: z.object({
    spread_id: z.string().uuid(),
    llm_context: z.string().optional()
  }),

  tarot_reset_session: z.object({})
};

export type TarotToolInput = z.infer<typeof TarotToolSchemas[keyof typeof TarotToolSchemas]>;
