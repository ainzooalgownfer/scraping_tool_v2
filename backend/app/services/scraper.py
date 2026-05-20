import requests
from bs4 import BeautifulSoup
import random
from typing import List, Dict
from urllib.parse import urljoin

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]

def scrape_quotes_page(url: str = "http://quotes.toscrape.com") -> Dict:
    """Scrape quotes, authors, tags, and profile links completely dynamically."""
    headers = {"User-Agent": random.choice(USER_AGENTS)}
    resp = requests.get(url, timeout=15, headers=headers)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    quote_divs = soup.select("div.quote")

    quotes_data = []
    author_links = set()

    for quote in quote_divs:
        text = quote.select_one("span.text").get_text(strip=True)
        author = quote.select_one("small.author").get_text(strip=True)
        tags = [tag.get_text(strip=True) for tag in quote.select("div.tags a.tag")]
        
        # Extract relative link
        author_link_tag = quote.select_one("span a")
        if author_link_tag and author_link_tag.has_attr("href"):
            relative_href = author_link_tag['href']
            
            # Dynamically merge the current scraped URL with the relative path
            absolute_url = urljoin(url, relative_href)
            author_links.add(absolute_url)

        quotes_data.append({
            "text": text,
            "author": author,
            "tags": tags,
        })

    title_tag = soup.find("title")
    page_title = title_tag.get_text(strip=True) if title_tag else "Quotes to Scrape"

    return {
        "url": url,
        "title": page_title,
        "total_quotes": len(quotes_data),
        "quotes": quotes_data,          
        "links": list(author_links),    
    }


scrape_page = scrape_quotes_page