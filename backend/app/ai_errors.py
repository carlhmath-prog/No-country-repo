from fastapi import HTTPException, status
from openai import APIConnectionError, AuthenticationError, OpenAIError, RateLimitError


def convertir_error_openai(error: OpenAIError) -> HTTPException:
    if isinstance(error, RateLimitError):
        error_body = getattr(error, "body", None)
        provider_error = error_body.get("error", {}) if isinstance(error_body, dict) else {}
        error_code = getattr(error, "code", None) or provider_error.get("code")
        error_type = getattr(error, "type", None) or provider_error.get("type")
        if error_code == "credit_balance_exhausted" or error_type == "insufficient_quota":
            return HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=(
                    "La cuenta de OpenAI no tiene créditos disponibles. "
                    "Agrega saldo o revisa la facturación de la API para usar las funciones de IA."
                ),
            )
        return HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="OpenAI alcanzó el límite de solicitudes. Espera un momento e inténtalo de nuevo.",
        )

    if isinstance(error, AuthenticationError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI rechazó la clave configurada. Verifica o reemplaza OPENAI_API_KEY.",
        )

    if isinstance(error, APIConnectionError):
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="El backend no pudo conectarse a OpenAI. Revisa la red e inténtalo de nuevo.",
        )

    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="El proveedor de IA no pudo completar la solicitud.",
    )
