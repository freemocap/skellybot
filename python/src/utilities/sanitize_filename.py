import re

def sanitize_name(name: str) -> str:
    """
    Sanitize a name to be a valid directory name
    """
    sanitized = (name.replace(" ", "_")
                 .replace(":", "-")
                 .replace("/", "-")
                 .replace("\\", "-")
                 .replace("|", "-")
                 .replace("?", "")
                 .replace("*", "")
                 .replace("<", "")
                 .replace(">", "")
                 .replace('"', "")
                 .replace("'", "")
                 .replace("`", ""))

    # Collapse any consecutive dashes into a single dash
    sanitized = re.sub(r'-+', '-', sanitized)

    # Remove any leading or trailing dashes
    sanitized = sanitized.strip('-')

    # Remove trailing dots
    sanitized = sanitized.rstrip('.')

    # Provide a default name if the result is empty
    if not sanitized:
        sanitized = "default_name"

    return sanitized