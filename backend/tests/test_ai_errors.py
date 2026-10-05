import unittest

import httpx
from fastapi import status
from openai import RateLimitError

from app.ai_errors import convertir_error_openai


class OpenAiErrorMappingTests(unittest.TestCase):
    def rate_limit_error(self, error_code, error_type):
        response = httpx.Response(
            status_code=429,
            request=httpx.Request("POST", "https://api.openai.com/v1/responses"),
        )
        return RateLimitError(
            "OpenAI rate limit",
            response=response,
            body={
                "error": {
                    "code": error_code,
                    "type": error_type,
                    "message": "provider message",
                }
            },
        )

    def test_maps_exhausted_credit_balance_to_payment_required(self):
        error = self.rate_limit_error("credit_balance_exhausted", "insufficient_quota")

        mapped = convertir_error_openai(error)

        self.assertEqual(mapped.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertIn("no tiene créditos disponibles", mapped.detail)

    def test_maps_request_rate_limit_separately(self):
        error = self.rate_limit_error("rate_limit_exceeded", "requests")

        mapped = convertir_error_openai(error)

        self.assertEqual(mapped.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn("límite de solicitudes", mapped.detail)
