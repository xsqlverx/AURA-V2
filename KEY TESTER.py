import getpass
import requests

def verify_openrouter_key() -> None:
    # Prompts for key securely without echoing characters to terminal
    api_key = getpass.getpass("Enter your OpenRouter API Key (hidden): ").strip()
    
    # Fallback to standard input if getpass receives empty input
    if not api_key:
        api_key = input("Paste your OpenRouter API Key: ").strip()

    if not api_key:
        print("[ERROR] API key cannot be empty.")
        return

    # OpenRouter's dedicated key inspection endpoint
    url = "https://openrouter.ai/api/v1/auth/key"
    headers = {
        "Authorization": f"Bearer {api_key}",
    }

    print("\nChecking key status against OpenRouter...")

    try:
        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code == 200:
            key_data = response.json().get("data", {})
            print("[SUCCESS] 200 OK — Key is fresh and active!\n")
            print(f"• Label:        {key_data.get('label', 'Default')}")
            print(f"• Total Usage:  ${key_data.get('usage', 0):.4f}")
            print(f"• Credit Limit: {key_data.get('limit') if key_data.get('limit') is not None else 'Unlimited'}")
            print(f"• Free Tier:    {key_data.get('is_free_tier', False)}")
            print(f"• Rate Limit:   {key_data.get('rate_limit', {}).get('requests', 'Standard')} reqs")
        elif response.status_code == 401:
            print("[FAILED] 401 Unauthorized — The API key is invalid or has expired.")
        elif response.status_code == 402:
            print("[WARNING] 402 Payment Required — Valid key, but insufficient credits.")
        else:
            print(f"[FAILED] HTTP {response.status_code}: {response.text}")

    except requests.exceptions.RequestException as error:
        print(f"[ERROR] Request failed: {error}")

if __name__ == "__main__":
    verify_openrouter_key()