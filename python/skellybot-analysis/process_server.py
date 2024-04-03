

async def process_category(category):
    print(f"Processing category: {category.name}")
    for channel in category.text_channels:
        await process_channel(channel)

async def process_channel(channel):
    print(f"Processing channel: {channel.name}")
    # Retrieve all threads in the channel
    threads = await channel.threads()
    for thread in threads:
        await process_thread(thread)

async def build_couplet_list(messages):
    couplets = []
    ai_responses = []
    human_message = None

    for message in messages:
        # Check if the message is from the bot (AI response)
        if message.author == client.user:
            # The first message from the bot is a copy of the human's initial message
            if not human_message:
                human_message = HumanMessage.from_discord_message(message)
            else:
                # This is an actual AI response
                ai_responses.append(AiResponse.from_discord_message(message))
        else:
            # This is a human message
            if human_message:
                # Save previous couplet if it exists
                couplets.append(Couplet(human_message=human_message, ai_responses=ai_responses))
                ai_responses = []  # Reset the AI responses for the next couplet
            human_message = HumanMessage.from_discord_message(message)

    # Add the last couplet if the last message was from a human
    if human_message:
        couplets.append(Couplet(human_message=human_message, ai_responses=ai_responses))

    return couplets

async def process_thread(thread):
    print(f"Processing thread: {thread.name}")
    messages = [message async for message in thread.history(limit=None)]
    couplets = await build_couplet_list(messages)
    print(f"Found {len(couplets)} couplets in thread: {thread.name}")

async def process_server(server):
    print(f'Successfully connected to the guild: {target_server.name} (ID: {target_server.id})')
    for category in server.categories:
        if category.name.startswith('#'):
            await process_category(category)
        else:
            print(f"Ignoring category: {category.name}")
