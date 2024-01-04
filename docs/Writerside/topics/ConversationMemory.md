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
    - I would want to implement something like this, but implement something like:
        - All messages tied to the [User](User.md) are in the vector store
        - Retriever accesses this vector store based on similarity to current [Couplet](Couplet.md) [Context](ContextRoute.md)inversely weighted by time (recent messages advantaged)
        - Messages within [Chat](Chat.md) context given a (very?) big advantage over messages outside of context (Tunable via [UserInterface](User-Interface.md)) 
        - Give a (very strong) advantage to 'in-chat' (ensuring they will be selected in the [RAG](Retrieval-Augmented-Generation.md) model), 

or like, sigmoid or whatever so that recent messages within the conversation are weighted more heavily than older messages.
    - [https://js.langchain.com/docs/modules/data_connection/retrievers/time_weighted_vectorstore](https://js.langchain.com/docs/modules/data_connection/retrievers/time_weighted_vectorstore)
