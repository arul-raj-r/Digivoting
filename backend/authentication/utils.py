from authentication.models import AuditLog

def log_event(user, action, request=None, details=None):
    """
    Log an event to the AuditLog database table.
    """
    if details is None:
        details = {}
    
    ip_address = None
    user_agent = None
    
    if request:
        # Get client IP address
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR')
            
        # Get user agent
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
    return AuditLog.objects.create(
        user=user if user and user.is_authenticated else None,
        action=action,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details
    )
