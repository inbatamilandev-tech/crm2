import threading

# Thread-local storage for workflow execution context.
# Stores:
# - captured field values (for stage change detection)
# - chain_id (for loop prevention and audit trails)
_state = threading.local()

def get_chain_id():
    return getattr(_state, 'chain_id', None)

def set_chain_id(chain_id):
    _state.chain_id = chain_id

def clear_chain_id():
    if hasattr(_state, 'chain_id'):
        del _state.chain_id

def capture_task(task):
    """Store a newly created task for retrieval in the current request/response cycle."""
    if not hasattr(_state, 'captured_tasks'):
        _state.captured_tasks = []
    _state.captured_tasks.append(task)

def get_captured_tasks():
    """Retrieve all tasks created during this thread's execution."""
    return getattr(_state, 'captured_tasks', [])

def clear_captured_tasks():
    """Reset the captured tasks list."""
    if hasattr(_state, 'captured_tasks'):
        _state.captured_tasks = []
