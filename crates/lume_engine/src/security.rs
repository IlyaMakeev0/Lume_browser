use url::Url;

const BLOCKED_SCHEMES: &[&str] = &["data", "file", "javascript"];

pub fn ensure_allowed_navigation(url: &str) -> Result<(), String> {
    let parsed = Url::parse(url).map_err(|error| error.to_string())?;

    if BLOCKED_SCHEMES.contains(&parsed.scheme()) {
        return Err(format!(
            "Navigation with '{}' scheme is blocked by the Lume engine policy.",
            parsed.scheme()
        ));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::ensure_allowed_navigation;

    #[test]
    fn blocks_javascript_urls() {
        assert!(ensure_allowed_navigation("javascript:alert(1)").is_err());
    }

    #[test]
    fn allows_https_urls() {
        assert!(ensure_allowed_navigation("https://example.com").is_ok());
    }
}
