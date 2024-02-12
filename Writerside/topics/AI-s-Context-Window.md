# Skellybot's Context Window


## 📄🪟  - The AI's Context Window
The AI only knows **exactly** what we sent it from this end. It is what is known as **stateless**, it doesn't "remember" anything about the millions of interactions it gets each minute, it can only work with what is sent along with your chat message: known as the `context window`. 

When you send a `message` in an AI chat thread, behind the scenes, the `bot` constructs the `context window` to send along with it. 

## Primary context sources: 
- **User message.** your most recent `user message`, i.e. the last thing you said in the thread
  - this gets special focus in the LLM as the thing it's paying the most attention to. 
- **Chat history.** the `chat history`, composed of every message you and the AI have exchanged in the thread so far (without a `~` at the start)
  - this makes it so you can track an entire back-and-forth interaction, deepening the 
You can do a LOT with JUST the above. Describe your situation, task, knoweldge, in a succinct way at the start, and you'll be well on your way. 

## Added Value context sources

On the other hand, if you find yourself describing your situation a LOT, it might make sense to move that description to a more stable location:

- **Channel instructions.** the contents of the `channel description` for the channel the thread is within
  - an ideal spot for `task descriptions`, general things you're trying to do that you only want to describe to the bot once for all the threads in the channel
- **Category instructions.** all messages with 🤖 `reactions` from the `#bot-instructions` channel at the `category` level
  - an ideal spot for `project descriptions`, things that are universally relevant to your specific project category
- **Server instructions.** all messages with 🤖 `reactions` from the `#bot-instructions` channel at the `server` level
  - this is where the server `admin`

## So the `text blob` the LLM finally receives is:
```
[ Global Instructions ]    // if present
[ Category Instructions ]  // if present
[ Channel description ]    // if present

[ Thread chat history ]    < -- working memory
[ User message ]           < -- priority
```