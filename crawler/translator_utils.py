import os
import re
import ahocorasick

class VietPhraseTranslator:
    def __init__(self):
        self.dict_data = {}
        self.automaton = ahocorasick.Automaton()
        self.dict_path = os.path.join(os.path.dirname(__file__), "dicts")
        self.load_all_dicts()

    def load_all_dicts(self):
        """Nạp từ điển thông minh: Nạp nghĩa chung trước, Tên riêng (Names) nạp sau cùng để ưu tiên"""
        if not os.path.exists(self.dict_path):
            print(f"❌ Không tìm thấy thư mục: {self.dict_path}")
            return

        # Lấy tất cả file .txt trong thư mục dicts
        all_files = [f for f in os.listdir(self.dict_path) if f.endswith(".txt")]
        
        # 1. Lọc ra các file Tên riêng (Cần ưu tiên nạp sau cùng để ghi đè nghĩa thường)
        # Bao gồm các file có tên chứa: Name, Names, PhatAm, NPC, Place
        priority_keywords = ["Name", "Names", "PhatAm", "NPC", "Place"]
        priority_files = [f for f in all_files if any(key in f for key in priority_keywords)]
        
        # 2. Các file còn lại là Vietphrase (Dù bạn có chia nhỏ thành Vietphrase_1, _2...)
        common_files = [f for f in all_files if f not in priority_files]
        
        # Thứ tự nạp: Common nạp trước -> Priority nạp sau
        ordered_files = common_files + priority_files
        print(f"--- Đang nạp {len(ordered_files)} file từ điển theo thứ tự ưu tiên... ---")

        raw_dict = {}
        for filename in ordered_files:
            full_path = os.path.join(self.dict_path, filename)
            try:
                # Dùng utf-8-sig và errors='ignore' để tránh lỗi ký tự lạ trên server Linux
                with open(full_path, "r", encoding="utf-8-sig", errors='ignore') as f:
                    for line in f:
                        if '=' in line:
                            parts = line.strip().split('=')
                            if len(parts) >= 2:
                                key = parts[0].strip()
                                # LẤY 1 NGHĨA ĐẦU: Cắt bỏ sau dấu | và /
                                val = parts[1].split('|')[0].split('/')[0].strip()
                                if key:
                                    # Cơ chế Ghi đè (Upsert): File nạp sau (Names) sẽ đè lên file nạp trước
                                    raw_dict[key] = val
            except Exception as e:
                print(f"⚠️ Lỗi nạp file {filename}: {e}")

        # Nạp dữ liệu vào bộ máy Aho-Corasick để tìm kiếm siêu tốc
        for key, value in raw_dict.items():
            try:
                self.automaton.add_word(key, (len(key), value))
            except:
                continue # Bỏ qua nếu có key lỗi trùng lặp
                
        self.automaton.make_automaton()
        print(f"✅ Đã nạp xong {len(raw_dict)} cụm từ vào RAM.")

    def post_process(self, text):
        """Hàm dọn dẹp văn bản sau khi dịch: Sửa dấu câu, viết hoa..."""
        if not text: return ""

        # 1. Chuẩn hóa dấu câu Trung -> Việt
        text = text.replace('，', ',').replace('。', '.').replace('！', '!').replace('？', '?')
        text = text.replace('：', ':').replace('；', ';').replace('（', '(').replace('）', ')')

        # 2. Xử lý khoảng trắng thừa
        text = re.sub(r'\s+', ' ', text)

        # 3. Fix lỗi dấu câu dính dấu cách phía trước (Ví dụ: "Học tập ,")
        text = re.sub(r'\s+([,.;:!?\)])', r'\1', text)
        
        # 4. Thêm dấu cách sau dấu câu nếu thiếu
        text = re.sub(r'([,.;:!?])(?=[^\s])', r'\1 ', text)

        # 5. Viết hoa chữ cái đầu tiên của văn bản
        text = text.strip()
        if not text: return ""
        text = text[0].upper() + text[1:]

        # 6. Viết hoa sau các dấu kết thúc câu (. ! ?)
        def uppercase_match(m):
            return m.group(1) + m.group(2).upper()
        
        # Regex hỗ trợ toàn bộ bảng chữ cái tiếng Việt Unicode
        text = re.sub(r'([.!?]\s+)([a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ])', 
                      uppercase_match, text)

        return text

    def convert(self, text):
        """Hàm thực hiện convert văn bản gốc"""
        if not text: return ""
        
        matches = []
        # Tìm kiếm tất cả các cụm từ khớp trong văn bản bằng Automaton
        for end_index, (length, value) in self.automaton.iter(text):
            start_index = end_index - length + 1
            matches.append((start_index, end_index, value))
        
        if not matches: return text
        
        # Sắp xếp để lấy cụm từ dài nhất ưu tiên (Longest Match)
        matches.sort(key=lambda x: (x[0], -(x[1] - x[0])))
        
        final_output = []
        last_idx = 0
        for start, end, value in matches:
            if start < last_idx: continue
            if start > last_idx:
                final_output.append(text[last_idx:start])
            final_output.append(value + " ") # Thêm cách để tránh dính chữ
            last_idx = end + 1
            
        final_output.append(text[last_idx:])
        return self.post_process("".join(final_output))

# Khởi tạo một đối tượng dịch thuật duy nhất để dùng chung
translator = VietPhraseTranslator()

def translate_text(text, limit=None):
    """Hàm API chính để dịch văn bản từ main.py gọi sang"""
    if not text: return ""
    if limit: text = text[:limit]
    # Bỏ xuống dòng để dịch mượt hơn theo cụm từ
    text = text.replace('\n', ' ').replace('\r', '')
    return translator.convert(text)
