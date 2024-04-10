def sanitize_name(name: str) -> str:
    """
    Sanitize a name to be a valid directory name
    """
    return name.replace(" ", "_").replace(":", "-").replace("/", "-").replace("\\", "-").replace("|", "-")
