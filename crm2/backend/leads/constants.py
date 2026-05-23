VALID_TRANSITIONS = {
    "new": ["contacted", "lost"],
    "contacted": ["qualified", "lost"],
    "qualified": ["proposal", "lost"],
    "proposal": ["won", "lost"]
}

STATUS_TO_STEP = {
    "new": "Initial Call",
    "contacted": "Follow-up Call",
    "qualified": "Meeting",
    "proposal": "Send Quote",
    "won": "Invoice + Closed Won",
    "lost": "Closed Lost"
}
