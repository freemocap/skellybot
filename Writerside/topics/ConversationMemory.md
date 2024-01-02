# Conversation Memory

Memory within a conversation,[LangChain Memory Docs](https://js.langchain.com/docs/modules/memory/)

Development plan:

Required functionality:
[ ]- Simple Buffer (keep `n` most recent messages) 
    - [https://python.langchain.com/docs/expression_language/cookbook/memory](https://python.langchain.com/docs/expression_language/cookbook/memory)

Future development:
[ ]- Token Buffer (keep a buffer of messages that is less than `n` tokens)
[ ]- Summary Buffer (keep a buffer of messages that is less than `n` tokens, but also summarize the messages)
[ ]- Time weighted Vectorstore (keep a vectorstore of messages, weighted by time)
    - [https://js.langchain.com/docs/modules/data_connection/retrievers/time_weighted_vectorstore](https://js.langchain.com/docs/modules/data_connection/retrievers/time_weighted_vectorstore)
