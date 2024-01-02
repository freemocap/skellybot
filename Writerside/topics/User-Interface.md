# User Interface

The stuff we want to let the [User](User.md) control about the [ChatBot](ChatBot.md)

## LLM Config
- [ ] ModelName (default = "gpt4-1106-preview" for now, "gpt4-turbo" when it becomes available)
- [ ] Temperature (default = 0.7 I think)
- [ ] **OtherModelParameters

## Conversation Memory
- [ ] Type, window, etc

## [Vectorstore](VectorStore.md) config
- [ ] Which [Vectorstore](VectorStore.md) [contexts](ContextRoute.md) to make available:
  - [ ] [FileSystem](FileSystem.md) interface kinda thing)
  - [ ] Individual Documents (think like textbooks, websites, etc)
   
- [ ] Retrieval
  - [ ] By Tag (human applied)
  - [ ] By Topic (AI extracted)
  - [ ] By Summary (AI generated)
    - Generate summaries at multiple scales, like I did with the [PaperSummary](https://github.com/jonmatthis/chatbot/blob/main/chatbot/ai/workers/green_check_handler/parse_green_check_messages.py#L20) thing in OG [ClassBot](ClassBot.md) 
     
