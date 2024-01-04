# ContextRoute✨

## Description

A context route defines the "location" where a conversation is taking place. 

The "root" of the context tree is the [User](User.md) themselves, and the leaves are the [Couplet](Couplet.md) 

This diagram shows the context route tree in the Discord interface. 

<img src="conversation_context_tree_diagram.drawio.png" width="800" height="800"/>

A typical chat will happen in a [Thread](Thread.md) in a [Channel](Channel.md) in a [Category](Category.md). 
In that case, a given [Couplet](Couplet.md)'s route for a [Chat](Chat.md) that occurs in a thread would be: 

(`id` is a `number` that Discord provide to uniquely identify each element, get it by turning on developer tools in Discord and right-clicking any element in the UI])

- [User](User.md)/
	- [Interfaces](Interfaces.md)/
		- [Discord](Discord.md)/
			- [Servers](Server.md)/
				- server_[id]/
					- [Categories](Category.md)/
						- category_[id]/
							- [Channels](Channel.md)/
								- channel_[id]/
									- [Threads](Thread.md)/
										- thread_[id]/
											- [Couplets](Couplet.md)/
												- couplet0
													- [HumanMessage](HumanMessage.md)
													- [AiResponse](AiResponse.md)

tl;dr - 

![](https://64.media.tumblr.com/90a3ea02f921c3d2d46013474136d82f/7b36ed59d1b14c9b-ec/s540x810/d14a5468e5240834f1dbcb5531fde7a14667211d.gif
)





