# Miko voice model (sample-voice-v1)

`sample-voice-v1.onnx` is a piper-plus model fine-tuned from the piper-plus
`zs-v1` base model to speak as Miko, the AITuber OnAir character. The voice is
synthetic: its training data was generated with Irodori-TTS from a designed
voice, not recorded from a person.

- Base model: piper-plus zs-v1 (MIT; see `piper-plus-base-model-MIT.txt` and
  `piper-plus-base-model-NOTICE.md` for the base model's provenance).
- Training sentences: original sentences written for this model and the ITA
  corpus (public domain).
- Teacher model used to generate the training audio: Irodori-TTS (MIT).

The model may be used with this demo. Miko remains the character of AITuber
OnAir, © Yuki Shindo, under the Miko Character Usage Guidelines
(https://miko.aituberonair.com/#terms).
