# Notices and provenance

## piper-plus model and code

piper-plus: https://github.com/ayutaz/piper-plus

The zs-v1 model is the existing v7 epoch-32 trained artifact, repackaged for
fine-tuning and reference-conditioned inference. Model weights and examples
retain the original v7 MIT terms. The legacy root checkpoint is a different
model and retains its existing CC BY 4.0 terms.

## CAM++ encoder

CAM++ weights originate from Alibaba DAMO Academy / ModelScope iic:
https://modelscope.cn/models/iic/speech_campplus_sv_zh-cn_16k-common

Reference implementation and Apache-2.0 license:
https://github.com/modelscope/3D-Speaker

This bundle redistributes an ONNX conversion from the piper-plus research
mirror, not newly trained encoder weights. The ONNX conversion preserves
the source mirror bytes and SHA256 recorded in `provenance.json`.
See `licenses/CAMPP-APACHE-2.0.txt` for the license text.

Hui Wang, Chengdong Liang, Shutao Wang, Zhifu Chen, Binbin Zhang, Xu Xiang,
Yanlei Deng, and Yanmin Qian. CAM++: A Fast and Efficient Network for Speaker
Verification Using Context-aware Masking. Interspeech, 2023.

## Training datasets

No source dataset audio, dataset identities, reference recordings, or private
evaluation files are included in this bundle. The following attributions
identify datasets from the original training recipe, rather than licensing
their contents under this model's MIT license.

- MOE-Speech, by litagin; Japanese subset reformatted for training.
  Upstream terms: https://huggingface.co/datasets/litagin/moe-speech/blob/ca1ce748bc1c2d690043a2faf780fc0b2747001d/LICENSE.md
  Those terms expressly distinguish publication of a trained model from
  redistribution of the dataset. Dataset audio redistribution and disclosure
  of specific identification names and corresponding sources are prohibited.
  This bundle contains no such source recordings or identity map.
- LibriTTS-R, by Yuma Koizumi, Heiga Zen, Shigeki Karita, Yifan Ding, Kohei
  Yatabe, Nobuyuki Morioka, Michiel Bacchiani, Yu Zhang, Wei Han, and Ankur Bapna.
  LibriTTS-R: A Restored Multi-Speaker Text-to-Speech Corpus, 2023.
  CC BY 4.0: https://www.openslr.org/141/
- AISHELL-3, provided by Beijing Shell Shell Technology Co., Ltd., by Yao Shi,
  Hui Bu, Xin Xu, Shaoji Zhang, and Ming Li. AISHELL-3: A Multi-speaker Mandarin
  TTS Corpus and the Baselines. Apache-2.0: https://www.openslr.org/93/
- CML-TTS Spanish/French/Portuguese v0.1, by Frederico S. Oliveira, Edresson
  Casanova, Arnaldo Candido Junior, Anderson S. Soares, and Arlindo R. Galvao Filho.
  CML-TTS: A Multilingual Dataset for Speech Synthesis in Low-Resource Languages,
  Text, Speech, and Dialogue, 2023. CC BY 4.0:
  https://github.com/freds0/CML-TTS-Dataset

The original data were filtered/reformatted into the model's six-language
training recipe. Details are aggregate counts in `training_recipe.json`.
Source dataset terms remain separate from model and encoder licenses.
