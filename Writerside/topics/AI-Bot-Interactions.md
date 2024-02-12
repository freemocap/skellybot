# Skellybot Interactions


## 🔮🤖 - AI Bot Interactions
Ways you can interact with the bot within discord.

- 🔮 -  `/chat` spawns a new chat `thread`, with a `text:` parameter you can put something in to get started.
  - 🗨️ - `sending` a `message` will trigger the bot to process its `context window` and produce a `response` which it will gradually `stream` by updating its response message. 
  - 🗒️ - a note for long AI messages: if it runs over the message length, it will chop it off and start a fresh message, but also attach the complete message response as a `text file`, which you can either `download` or just click to expand it and read the raw text. 
  - 🚫 - a `~` at the start of your message in an AI chat thread means the bot won't notice a message, so you can make a quick note, or @ tag me to come have a look at something specific, whatever you like. 

- 📎 - attachment types supported:
  - 🎙️ - `voice messages` will first be transcribed into `text`, and then sent off to the LLM, enabling a much more naturalistic way of speaking your thoughts. 
    - On `mobile` you can do this natively, on `desktop` you need to attach a file you recorded separately (most OSs have an app for this natively)
  - 📃 - `text files` will be added to the `context window` along with your message.

- ⚙️  - adjust the `prompt settings` for your AI conversations:
  - 🤖 - use the robot react emoji to toggle whether messages you've placed in the `#bot-instructions` channel are sent along with your messages to the bot.
  - 📝 - edit `channel topics` to give a channel-specific behaviors.