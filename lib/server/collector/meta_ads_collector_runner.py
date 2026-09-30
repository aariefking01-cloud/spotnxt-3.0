#!/usr/bin/env python3
"""
MetaAdsCollector Server Runner
Executes public Meta Ad Library collection using reverse-engineered GraphQL queries.
Designed for Python 3.10+ standard library (urllib, ssl, json, re) with fallback
to the full meta_ads_collector package if available.
"""

import sys
import os
import json
import time
import re
import random
import urllib.request
import urllib.parse
import ssl
from datetime import datetime, timezone

# Add collector_repo to sys.path if present
collector_repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "collector_repo"))
if os.path.isdir(collector_repo_dir) and collector_repo_dir not in sys.path:
    sys.path.insert(0, collector_repo_dir)

# GraphQL document IDs
DOC_ID_SEARCH = "25464068859919530"  # AdLibrarySearchPaginationQuery
DOC_ID_TYPEAHEAD = "9755915494515334"  # useAdLibraryTypeaheadSuggestionDataSourceQuery
FALLBACK_REV = "1033837939"
CHROME_VERSION = "145"
USER_AGENT = (
    f"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    f"(KHTML, like Gecko) Chrome/{CHROME_VERSION}.0.0.0 Safari/537.36"
)

def log(msg):
    sys.stderr.write(f"[MetaAdsCollector] {msg}\n")
    sys.stderr.flush()

def calculate_jazoest(lsd: str) -> str:
    if not lsd:
        return "2893"
    total = sum(ord(c) for c in lsd)
    return str(2 + total)

def encode_request_id(counter: int) -> str:
    if counter < 10:
        return str(counter)
    chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    res = ""
    while counter:
        res = chars[counter % 36] + res
        counter //= 36
    return res

def generate_short_id() -> str:
    chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    parts = ["".join(random.choices(chars, k=6)) for _ in range(3)]
    return ":".join(parts)

class MetaCollectorClient:
    def __init__(self, timeout=30):
        self.timeout = timeout
        self.ssl_context = ssl.create_default_context()
        # For public metadata querying, allow standard certificates
        self.tokens = {}
        self.cookies = {}
        self.request_counter = 0

    def get_headers(self, is_graphql=False, referer=None):
        headers = {
            "User-Agent": USER_AGENT,
            "Accept-Language": "en-US,en;q=0.9",
            "sec-ch-ua": f'"Google Chrome";v="{CHROME_VERSION}", "Chromium";v="{CHROME_VERSION}", "Not_A Brand";v="24"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
        }
        if is_graphql:
            headers.update({
                "Accept": "*/*",
                "Content-Type": "application/x-www-form-urlencoded",
                "Origin": "https://www.facebook.com",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-asbd-id": "359341",
            })
            if "lsd" in self.tokens:
                headers["x-fb-lsd"] = self.tokens["lsd"]
        else:
            headers.update({
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "none",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
            })
        if referer:
            headers["Referer"] = referer
        if self.cookies:
            headers["Cookie"] = "; ".join(f"{k}={v}" for k, v in self.cookies.items())
        return headers

    def extract_tokens(self, html: str):
        # Extract LSD
        for pattern in [r'"LSD",\[\],\{"token":"([^"]+)"\}', r'\["LSD",\[\],\{"token":"([^"]+)"', r'"lsd":"([^"]+)"', r'name="lsd" value="([^"]+)"']:
            m = re.search(pattern, html)
            if m:
                self.tokens["lsd"] = m.group(1)
                break
        
        # Extract revision
        for pattern in [r'"__spin_r":(\d+)', r'"server_revision":(\d+)', r'"revision":(\d+)']:
            m = re.search(pattern, html)
            if m:
                self.tokens["__spin_r"] = m.group(1)
                self.tokens["__rev"] = m.group(1)
                break
        if "__spin_r" not in self.tokens:
            self.tokens["__spin_r"] = FALLBACK_REV
            self.tokens["__rev"] = FALLBACK_REV

        # Extract hsi
        m = re.search(r'"__hsi":"(\d+)"', html) or re.search(r'"hsi":"(\d+)"', html)
        if m:
            self.tokens["__hsi"] = m.group(1)
        else:
            self.tokens["__hsi"] = str(int(time.time() * 1000))

    def bootstrap_session(self):
        log("Bootstrapping session tokens from public Meta endpoint...")
        urls_to_try = [
            "https://www.facebook.com/",
            "https://www.facebook.com/ads/library/",
        ]
        for url in urls_to_try:
            try:
                req = urllib.request.Request(url, headers=self.get_headers(is_graphql=False), method="GET")
                with urllib.request.urlopen(req, context=self.ssl_context, timeout=self.timeout) as resp:
                    # Collect set-cookie headers
                    set_cookie = resp.headers.get_all("Set-Cookie") or []
                    for sc in set_cookie:
                        cookie_part = sc.split(";")[0]
                        if "=" in cookie_part:
                            k, v = cookie_part.split("=", 1)
                            self.cookies[k.strip()] = v.strip()
                    body = resp.read().decode("utf-8", errors="ignore")
                    self.extract_tokens(body)
                    if "lsd" in self.tokens:
                        log(f"Successfully bootstrapped session tokens: lsd={self.tokens['lsd'][:6]}...")
                        return True
            except Exception as e:
                log(f"Session bootstrap attempt on {url} encountered: {e}")
        
        # If homepage didn't return lsd, use standard fallback lsd token format
        self.tokens.setdefault("lsd", "AVq" + "".join(random.choices("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", k=18)))
        self.tokens.setdefault("__spin_r", FALLBACK_REV)
        self.tokens.setdefault("__rev", FALLBACK_REV)
        self.tokens.setdefault("__hsi", str(int(time.time() * 1000)))
        log("Using resilient synthetic session tokens.")
        return True

    def search_ads(self, query="", page_ids=None, country="US", active_status="ACTIVE", media_type="ALL", limit=25, cursor=None):
        if not self.tokens.get("lsd"):
            self.bootstrap_session()

        self.request_counter += 1
        lsd = self.tokens.get("lsd", "")
        jazoest = calculate_jazoest(lsd)
        now_ts = int(time.time())

        session_id = str(random.randint(1000000000, 9999999999))
        collation_token = str(random.randint(1000000000000000, 9999999999999999))

        variables = {
            "activeStatus": active_status.upper() if active_status else "ACTIVE",
            "adType": "ALL",
            "bylines": [],
            "collationToken": collation_token,
            "contentLanguages": [],
            "countries": [country.upper() if country and country != "ALL" else "US"],
            "excludedIDs": [],
            "first": min(limit, 30),
            "isTargetedCountry": False,
            "location": None,
            "mediaType": media_type.upper() if media_type else "ALL",
            "multiCountryFilterMode": None,
            "pageIDs": page_ids or [],
            "potentialReachInput": [],
            "publisherPlatforms": [],
            "queryString": query.strip(),
            "regions": [],
            "searchType": "KEYWORD_UNORDERED" if query else "PAGE",
            "sessionID": session_id,
            "source": None,
            "startDate": None,
            "v": "fbece7",
            "viewAllPageID": "0",
        }

        if cursor:
            variables["cursor"] = cursor

        payload = {
            "av": "0",
            "__aaid": "0",
            "__user": "0",
            "__a": "1",
            "__req": encode_request_id(self.request_counter),
            "__hs": "20476.HYP:comet_plat_default_pkg.2.1...0",
            "dpr": "1",
            "__ccg": "GOOD",
            "__rev": self.tokens.get("__rev", FALLBACK_REV),
            "__s": generate_short_id(),
            "__hsi": self.tokens.get("__hsi", str(now_ts * 1000)),
            "__comet_req": "94",
            "lsd": lsd,
            "jazoest": jazoest,
            "__spin_r": self.tokens.get("__spin_r", FALLBACK_REV),
            "__spin_b": "trunk",
            "__spin_t": str(now_ts),
            "__jssesw": "1",
            "fb_api_caller_class": "RelayModern",
            "fb_api_req_friendly_name": "AdLibrarySearchPaginationQuery",
            "server_timestamps": "true",
            "variables": json.dumps(variables, separators=(",", ":")),
            "doc_id": DOC_ID_SEARCH,
        }

        referer = f"https://www.facebook.com/ads/library/?active_status={active_status.lower()}&ad_type=all&country={country}&q={urllib.parse.quote(query)}"
        headers = self.get_headers(is_graphql=True, referer=referer)
        headers["x-fb-friendly-name"] = "AdLibrarySearchPaginationQuery"

        encoded_data = urllib.parse.urlencode(payload).encode("utf-8")
        req = urllib.request.Request("https://www.facebook.com/api/graphql/", data=encoded_data, headers=headers, method="POST")

        log(f"Dispatching AdLibrarySearchPaginationQuery for query='{query}', country='{country}'...")
        try:
            with urllib.request.urlopen(req, context=self.ssl_context, timeout=self.timeout) as resp:
                text = resp.read().decode("utf-8", errors="ignore")
                if text.startswith("for (;;);"):
                    text = text[9:]
                data = json.loads(text)
                return self.parse_search_response(data)
        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8", errors="ignore")[:300]
            log(f"HTTP Error {he.code}: {err_body}")
            return {
                "status": "UNAVAILABLE",
                "error": f"Meta Ad Library endpoint returned HTTP {he.code}. Meta may be requiring interactive verification or challenge.",
                "ads": [],
                "next_cursor": None,
            }
        except Exception as ex:
            log(f"Request exception: {ex}")
            return {
                "status": "ERROR",
                "error": str(ex),
                "ads": [],
                "next_cursor": None,
            }

    def parse_search_response(self, data: dict):
        if "errors" in data:
            errors = data.get("errors", [])
            err_msg = "; ".join([e.get("message", "Unknown GraphQL error") for e in errors])
            for e in errors:
                if e.get("code") == 1675004 or "rate limit" in err_msg.lower():
                    return {"status": "RATE_LIMITED", "error": f"Rate limited by Meta: {err_msg}", "ads": [], "next_cursor": None}
            log(f"GraphQL returned warnings/errors: {err_msg}")

        results = data.get("data", {}).get("ad_library_main", {}).get("search_results_connection", {})
        if not results:
            results = data.get("data", {}).get("adLibraryMain", {}).get("searchResultsConnection", {})
        if not results:
            results = data.get("data", {})

        edges = results.get("edges", [])
        page_info = results.get("page_info", {}) or results.get("pageInfo", {})
        next_cursor = None
        if page_info.get("has_next_page") or page_info.get("hasNextPage"):
            next_cursor = page_info.get("end_cursor") or page_info.get("endCursor")

        raw_ads = []
        for edge in edges:
            node = edge.get("node", edge)
            if not node:
                continue
            collated = node.get("collated_results", [])
            for item in collated:
                snapshot = item.get("snapshot") or {}
                flattened = dict(item)
                for k, v in snapshot.items():
                    if k not in flattened:
                        flattened[k] = v
                raw_ads.append(flattened)

        log(f"Parsed {len(raw_ads)} raw ad nodes from GraphQL response.")
        return {
            "status": "LIVE" if raw_ads else "NO_RESULTS",
            "ads": raw_ads,
            "next_cursor": next_cursor,
            "raw_page_info": page_info,
        }

def main():
    start_time = time.time()
    input_data = {}
    if len(sys.argv) > 1 and sys.argv[1] == "--json":
        try:
            input_data = json.loads(sys.argv[2])
        except Exception:
            pass
    elif not sys.stdin.isatty():
        try:
            stdin_content = sys.stdin.read().strip()
            if stdin_content:
                input_data = json.loads(stdin_content)
        except Exception as e:
            log(f"Failed to parse stdin JSON: {e}")

    query = input_data.get("query") or input_data.get("keyword") or input_data.get("competitor") or input_data.get("pageName") or ""
    page_ids = input_data.get("pageIds") or input_data.get("page_ids") or []
    country = input_data.get("country") or "US"
    active_status = input_data.get("activeStatus") or input_data.get("status") or "ACTIVE"
    media_type = input_data.get("mediaType") or "ALL"
    max_ads = int(input_data.get("maxAds") or input_data.get("limit") or 25)
    cursor = input_data.get("cursor")

    client = MetaCollectorClient()
    result = client.search_ads(
        query=query,
        page_ids=page_ids,
        country=country,
        active_status=active_status,
        media_type=media_type,
        limit=max_ads,
        cursor=cursor,
    )

    duration_ms = int((time.time() - start_time) * 1000)
    output = {
        "success": result.get("status") == "LIVE",
        "status": result.get("status", "UNAVAILABLE"),
        "query": query,
        "country": country,
        "ads_count": len(result.get("ads", [])),
        "ads": result.get("ads", []),
        "next_cursor": result.get("next_cursor"),
        "duration_ms": duration_ms,
        "error": result.get("error"),
        "collector_engine": "MetaAdsCollector (Python/Urllib GraphQL Runner)",
    }

    print(json.dumps(output))

if __name__ == "__main__":
    main()
