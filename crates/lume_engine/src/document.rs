use scraper::{Html, Selector};
use serde::Serialize;
use url::Url;

#[derive(Debug, Clone, Serialize)]
pub struct DocumentSnapshot {
    pub url: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub language: Option<String>,
    pub text_preview: String,
    pub links: Vec<LinkCandidate>,
    pub resources: ResourceCounts,
}

#[derive(Debug, Clone, Serialize)]
pub struct LinkCandidate {
    pub label: String,
    pub href: String,
}

#[derive(Debug, Clone, Default, Serialize)]
pub struct ResourceCounts {
    pub stylesheets: usize,
    pub scripts: usize,
    pub images: usize,
}

pub fn parse_document(url: &str, html: &str) -> DocumentSnapshot {
    let document = Html::parse_document(html);
    let base_url = Url::parse(url).ok();

    let title = first_text(&document, "title");
    let description = meta_content(&document, "description");
    let language = html_language(&document);
    let links = collect_links(&document, base_url.as_ref());
    let resources = count_resources(&document);
    let text_preview = body_text_preview(&document, 900);

    DocumentSnapshot {
        url: url.to_string(),
        title,
        description,
        language,
        text_preview,
        links,
        resources,
    }
}

fn selector(query: &str) -> Selector {
    Selector::parse(query).expect("static CSS selector should parse")
}

fn first_text(document: &Html, query: &str) -> Option<String> {
    let selector = selector(query);

    document
        .select(&selector)
        .next()
        .map(|element| collapse_text(element.text()))
        .filter(|value| !value.is_empty())
}

fn meta_content(document: &Html, name: &str) -> Option<String> {
    let selector = selector("meta");

    document
        .select(&selector)
        .find(|element| {
            element
                .value()
                .attr("name")
                .or_else(|| element.value().attr("property"))
                .map(|value| value.eq_ignore_ascii_case(name))
                .unwrap_or(false)
        })
        .and_then(|element| element.value().attr("content"))
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn html_language(document: &Html) -> Option<String> {
    let selector = selector("html");

    document
        .select(&selector)
        .next()
        .and_then(|element| element.value().attr("lang"))
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn collect_links(document: &Html, base_url: Option<&Url>) -> Vec<LinkCandidate> {
    let selector = selector("a[href]");

    document
        .select(&selector)
        .filter_map(|element| {
            let raw_href = element.value().attr("href")?.trim();
            let href = resolve_href(raw_href, base_url)?;
            let label = collapse_text(element.text());

            Some(LinkCandidate {
                label: if label.is_empty() { href.clone() } else { label },
                href,
            })
        })
        .take(64)
        .collect()
}

fn resolve_href(raw_href: &str, base_url: Option<&Url>) -> Option<String> {
    if raw_href.starts_with('#') || raw_href.starts_with("javascript:") || raw_href.starts_with("mailto:") {
        return None;
    }

    if let Ok(url) = Url::parse(raw_href) {
        return Some(url.to_string());
    }

    base_url.and_then(|base| base.join(raw_href).ok()).map(|url| url.to_string())
}

fn count_resources(document: &Html) -> ResourceCounts {
    ResourceCounts {
        stylesheets: document.select(&selector(r#"link[rel~="stylesheet"]"#)).count(),
        scripts: document.select(&selector("script[src]")).count(),
        images: document.select(&selector("img[src]")).count(),
    }
}

fn body_text_preview(document: &Html, limit: usize) -> String {
    let selector = selector("body");
    let text = document
        .select(&selector)
        .next()
        .map(|element| collapse_text(element.text()))
        .unwrap_or_default();

    text.chars().take(limit).collect()
}

fn collapse_text<'a>(text: impl Iterator<Item = &'a str>) -> String {
    text.flat_map(|chunk| chunk.split_whitespace())
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::parse_document;

    #[test]
    fn extracts_document_metadata_and_links() {
        let snapshot = parse_document(
            "https://example.com/docs/",
            r#"
              <html lang="en">
                <head>
                  <title>Lume</title>
                  <meta name="description" content="Fast browser">
                  <link rel="stylesheet" href="/app.css">
                </head>
                <body>
                  <a href="/next">Next</a>
                  <img src="/hero.png">
                  <script src="/app.js"></script>
                </body>
              </html>
            "#,
        );

        assert_eq!(snapshot.title, Some("Lume".to_string()));
        assert_eq!(snapshot.description, Some("Fast browser".to_string()));
        assert_eq!(snapshot.language, Some("en".to_string()));
        assert_eq!(snapshot.links[0].href, "https://example.com/next");
        assert_eq!(snapshot.resources.stylesheets, 1);
        assert_eq!(snapshot.resources.scripts, 1);
        assert_eq!(snapshot.resources.images, 1);
    }
}
