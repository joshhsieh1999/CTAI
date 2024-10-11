def time_to_seconds(time_str):
    """Convert time string into seconds."""
    if 's' in time_str:
        # Format is in seconds
        return int(time_str[:-1])
    elif ':' in time_str:
        parts = time_str.split(':')
        if len(parts) == 2:
            # Format is minutes:seconds
            return int(parts[0]) * 60 + int(parts[1])
        elif len(parts) == 3:
            # Format is hours:minutes:seconds
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    return 0
