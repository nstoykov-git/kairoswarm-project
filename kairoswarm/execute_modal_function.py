from modal import Function

test = Function.from_name("test-openai-key", "test_openai_key")
print(test.remote())
