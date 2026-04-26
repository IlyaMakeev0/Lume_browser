pub fn extract_title(html: &str) -> Option<String> {
    let lower = html.to_ascii_lowercase();
    let title_start = lower.find("<title")?;
    let open_end = lower[title_start..].find('>')? + title_start + 1;
    let close_start = lower[open_end..].find("</title>")? + open_end;
    let title = html[open_end..close_start].trim();

    if title.is_empty() {
        None
    } else {
        Some(decode_basic_entities(title))
    }
}

pub fn text_preview(body: &str, limit: usize) -> String {
    let collapsed = body.split_whitespace().collect::<Vec<_>>().join(" ");
    collapsed.chars().take(limit).collect()
}

fn decode_basic_entities(value: &str) -> String {
    value
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
}

#[cfg(test)]
mod tests {
    use super::{extract_title, text_preview};

    #[test]
    fn extracts_title_from_html() {
        assert_eq!(
            extract_title("<html><title>Lume &amp; Engine</title></html>"),
            Some("Lume & Engine".to_string())
        );
    }

    #[test]
    fn collapses_body_preview_whitespace() {
        assert_eq!(text_preview("one\n\n two\tthree", 20), "one two three");
    }
}
