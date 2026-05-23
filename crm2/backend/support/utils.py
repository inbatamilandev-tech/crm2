import difflib
from .models import Case

def calculate_similarity(str1, str2):
    if not str1 or not str2:
        return 0.0
    return difflib.SequenceMatcher(None, str1.lower().strip(), str2.lower().strip()).ratio()

def find_duplicate_case(contact, subject, threshold=0.7):
    if not contact or not subject:
        return None
        
    # Find open cases for the same contact
    open_cases = Case.objects.filter(contact=contact, status__in=['New', 'Open', 'In Progress'])
    
    for case in open_cases:
        similarity = calculate_similarity(subject, case.subject)
        if similarity >= threshold:
            return case
    return None
