# 2023-12-31 Project Notes

## Services: 
###  [Discord](Discord)
  - /thread command
    - [X] opens a [Thread](Thread.md) in a Discord channel
    - [X] Configures a [Chatbot](Chatbot.md) for this thread
    - [ ] Create title card for the chat, with:
      - information about [Chat](Chat.md) 
      - interface to configure [Chatbot](Chatbot.md)

- [Slack](Slack.md)
  - (basically what [Discord](Discord.md) is doing, but in Slack context)
  - (interfacing with the [chatbot](Chatbot.md) module)
  
- shared/
  - /chatbot-core
    - /create-chatbot
	    - Creates a [Chatbot](Chatbot.md)
      - chat features
      - ai features
      - file system stuff
      - config 
    - chron (timer) jobs
      - definable per context route  
      - check in with users
      - run internal data analysis
      - dream images from context summaries
  - /ai
    - /langchain
      - /create-agent
	      - creates an [[Agent]]
		      - see: https://www.langchain.com/use-case/agents


- /image
  - [Images](Images(Images.md)
- /audio
  - [Audio](Audio.md)

# Bot lifetime management
- how to manage 'long term memory'/'bot storage?'
  - for now, just set a bot time out and pull history when re-initializing after timeout