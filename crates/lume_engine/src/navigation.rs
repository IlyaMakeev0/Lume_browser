use serde::Serialize;
use std::net::IpAddr;
use url::{form_urlencoded, Url};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum NavigationKind {
    Internal,
    Url,
    Search,
}

#[derive(Debug, Clone, Serialize)]
pub struct NavigationTarget {
    pub input: String,
    pub resolved_url: String,
    pub display_title: String,
    pub kind: NavigationKind,
}

pub fn resolve(input: &str) -> Result<NavigationTarget, String> {
    let trimmed = input.trim();

    if trimmed.is_empty() {
        return Err("Navigation input is empty.".to_string());
    }

    if is_internal_url(trimmed) {
        return Ok(NavigationTarget {
            input: trimmed.to_string(),
            resolved_url: trimmed.to_string(),
            display_title: internal_title(trimmed),
            kind: NavigationKind::Internal,
        });
    }

    if let Ok(url) = Url::parse(trimmed) {
        return Ok(url_target(trimmed, url));
    }

    if looks_like_host(trimmed) {
        let normalized = normalize_host_input(trimmed);

        let url = Url::parse(&normalized).map_err(|error| error.to_string())?;
        return Ok(url_target(trimmed, url));
    }

    let encoded_query: String = form_urlencoded::byte_serialize(trimmed.as_bytes()).collect();

    Ok(NavigationTarget {
        input: trimmed.to_string(),
        resolved_url: format!("https://duckduckgo.com/?q={encoded_query}"),
        display_title: format!("Search: {trimmed}"),
        kind: NavigationKind::Search,
    })
}

fn url_target(input: &str, url: Url) -> NavigationTarget {
    let host = url
        .host_str()
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| url.scheme().to_string());

    NavigationTarget {
        input: input.to_string(),
        resolved_url: url.to_string(),
        display_title: host,
        kind: NavigationKind::Url,
    }
}

fn is_internal_url(input: &str) -> bool {
    input.starts_with("lume://") || input.starts_with("about:")
}

fn internal_title(input: &str) -> String {
    match input {
        "lume://start" => "Lume Start".to_string(),
        "lume://new-tab" => "New Tab".to_string(),
        "lume://privacy" => "Privacy".to_string(),
        "lume://library" => "Library".to_string(),
        "about:blank" => "Blank Page".to_string(),
        _ => "Lume Internal".to_string(),
    }
}

fn looks_like_host(input: &str) -> bool {
    if input.contains(char::is_whitespace) {
        return false;
    }

    let Some(host) = host_candidate(input) else {
        return false;
    };

    host.eq_ignore_ascii_case("localhost") || host.parse::<IpAddr>().is_ok() || host.contains('.')
}

fn normalize_host_input(input: &str) -> String {
    let host = host_candidate(input).unwrap_or(input);
    let scheme = if host.eq_ignore_ascii_case("localhost") || host.parse::<IpAddr>().is_ok() {
        "http"
    } else {
        "https"
    };

    if host.parse::<IpAddr>().is_ok() && host.contains(':') && !input.starts_with('[') {
        let bracketed_host = format!("[{host}]");
        format!("{scheme}://{}", input.replacen(host, &bracketed_host, 1))
    } else {
        format!("{scheme}://{input}")
    }
}

fn host_candidate(input: &str) -> Option<&str> {
    let first_token = input.split('/').next().unwrap_or(input).trim();

    if first_token.is_empty() {
        return None;
    }

    if let Some(without_opening_bracket) = first_token.strip_prefix('[') {
        return without_opening_bracket.split(']').next();
    }

    if first_token.parse::<IpAddr>().is_ok() {
        return Some(first_token);
    }

    Some(first_token.split(':').next().unwrap_or(first_token))
}

#[cfg(test)]
mod tests {
    use super::{resolve, NavigationKind};

    #[test]
    fn resolves_plain_domain_to_https_url() {
        let target = resolve("example.com").unwrap();

        assert_eq!(target.kind, NavigationKind::Url);
        assert_eq!(target.resolved_url, "https://example.com/");
    }

    #[test]
    fn resolves_ipv4_address_to_http_url() {
        let target = resolve("192.168.1.22:8080").unwrap();

        assert_eq!(target.kind, NavigationKind::Url);
        assert_eq!(target.resolved_url, "http://192.168.1.22:8080/");
    }

    #[test]
    fn resolves_bracketed_ipv6_address_to_http_url() {
        let target = resolve("[::1]:3000").unwrap();

        assert_eq!(target.kind, NavigationKind::Url);
        assert_eq!(target.resolved_url, "http://[::1]:3000/");
    }

    #[test]
    fn resolves_raw_ipv6_address_to_http_url() {
        let target = resolve("::1").unwrap();

        assert_eq!(target.kind, NavigationKind::Url);
        assert_eq!(target.resolved_url, "http://[::1]/");
    }

    #[test]
    fn resolves_free_text_to_search() {
        let target = resolve("rust browser engine").unwrap();

        assert_eq!(target.kind, NavigationKind::Search);
        assert!(target.resolved_url.contains("duckduckgo.com"));
    }

    #[test]
    fn keeps_lume_internal_urls_internal() {
        let target = resolve("lume://start").unwrap();

        assert_eq!(target.kind, NavigationKind::Internal);
        assert_eq!(target.display_title, "Lume Start");
    }
}
