# Couplet🍃

A [HumanMessage](HumanMessage.md)/[AiResponse](AiResponse.md) pair
    - The fundamental atomic unit of a [Chat](Chat.md)
    - It usually doesn't make sense to split these up (except when counting up 'Human' vs 'AI' produced text statistics)

**SPECIAL CASE** 
    - The Starting message of chat might spoof the [HumanMessage](HumanMessage.md) 
by copying the [User](User.md)'s starting message into a [Chatbot](Chatbot.md) message and then replying to that) 