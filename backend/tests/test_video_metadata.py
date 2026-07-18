from services.video_metadata import build_video_publish_metadata


def test_build_video_publish_metadata_generates_title_description_and_tags():
    metadata = build_video_publish_metadata(
        book_title="Độc Cô Cầu Bại",
        author_name="Nguyễn Văn A",
        chapter_start=1,
        chapter_count=3,
        chapter_title="Chương đầu",
    )

    assert metadata["author_name"] == "Nguyễn Văn A"
    assert metadata["video_title"] == "Độc Cô Cầu Bại - Chương 1-3"
    assert "Độc Cô Cầu Bại" in metadata["video_description"]
    assert "Nguyễn Văn A" in metadata["video_description"]
    assert "Chương hiện tại" not in metadata["video_description"]
    assert "độc cô cầu bại" in metadata["video_tags"]
    assert "nguyễn văn a" in metadata["video_tags"]
    assert "video tự động" in metadata["video_tags"]


def test_build_video_publish_metadata_omits_author_tag_when_author_missing():
    metadata = build_video_publish_metadata(
        book_title="Độc Cô Cầu Bại",
        author_name=None,
        chapter_start=1,
        chapter_count=3,
    )

    assert metadata["author_name"] is None
    assert "do tác giả" not in metadata["video_description"]
    assert "tác giả chưa cập nhật" not in metadata["video_tags"]
    assert "độc cô cầu bại" in metadata["video_tags"]
    assert "video tự động" in metadata["video_tags"]


def test_build_video_publish_metadata_uses_single_chapter_text_for_one_chapter():
    metadata = build_video_publish_metadata(
        book_title="Huyền thoại",
        author_name="Lê Văn B",
        chapter_start=5,
        chapter_count=1,
    )

    assert metadata["video_title"] == "Huyền thoại - Chương 5"
    assert metadata["video_description"] == "Huyền thoại do tác giả Lê Văn B sáng tác. Video này được tạo tự động từ chương 5."
    assert metadata["video_tags"] == "huyền thoại, lê văn b, truyện, video tự động, chương 5"
