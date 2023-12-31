# Images

Either:
- Human Provides (or system auto-compiles) [TextData](TextData.md) and bot replies with [AiGeneratedImage](AiGeneratedImage.md)
- Human sends [HumanProvidedImage](HumanProvidedImage.md) and bot replies with [AiText](AiText.md)
  - AiText can be fed into an [LLmChain](LLMChain.md) or [Agent](Agent.md)

Uses:
- [OpenAI](OpenAi)
  - [Dalle3](Dalle3.md), or
- [LocalModels](LocalModels.md)
  - [StableDiffusion](StableDiffusion.md)
