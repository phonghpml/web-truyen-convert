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
        """Nạp từ điển và lọc sạch dấu / |"""
        if not os.path.exists(self.dict_path):
            print(f"❌ Không tìm thấy thư mục: {self.dict_path}")
            return

        # Thứ tự nạp: Vietphrase trước, Names sau để Names đè lên
        all_files = os.listdir(self.dict_path)
        priority_files = [f for f in all_files if "Name" in f or "Names" in f]
        other_files = [f for f in all_files if f not in priority_files and f.endswith(".txt")]
        
        ordered_files = other_files + priority_files
        print(f"--- Đang nạp {len(ordered_files)} file từ điển... ---")

        raw_dict = {}
        for filename in ordered_files:
            full_path = os.path.join(self.dict_path, filename)
            try:
                with open(full_path, "r", encoding="utf-8-sig") as f:
                    for line in f:
                        if '=' in line:
                            parts = line.strip().split('=')
                            if len(parts) >= 2:
                                key = parts[0].strip()
                                # LẤY 1 NGHĨA ĐẦU: Cắt bỏ sạch sẽ sau | và /
                                val = parts[1].split('|')[0].split('/')[0].strip()
                                if key:
                                    raw_dict[key] = val
            except Exception as e:
                print(f"Lỗi nạp {filename}: {e}")

        for key, value in raw_dict.items():
            self.automaton.add_word(key, (len(key), value))
        self.automaton.make_automaton()
        print(f"✅ Đã nạp {len(raw_dict)} cụm từ. Đã fix triệt để dấu câu và viết hoa.")

    def post_process(self, text):
        """Hàm dọn dẹp văn bản sau khi dịch"""
        if not text: return ""

        # 1. Chuẩn hóa dấu câu Trung -> Việt (Để Regex xử lý chính xác)
        text = text.replace('，', ',').replace('。', '.').replace('！', '!').replace('？', '?')
        text = text.replace('：', ':').replace('；', ';').replace('（', '(').replace('）', ')')

        # 2. Xóa dấu cách thừa dính chữ
        text = re.sub(r'\s+', ' ', text)

        # 3. XÓA DẤU CÁCH TRƯỚC DẤU CÂU (Fix lỗi "Học tập ,")
        text = re.sub(r'\s+([,.;:!?\)])', r'\1', text)
        
        # 4. THÊM DẤU CÁCH SAU DẤU CÂU (Nếu thiếu)
        text = re.sub(r'([,.;:!?])(?=[^\s])', r'\1 ', text)

        # 5. VIẾT HOA ĐẦU DÒNG
        text = text.strip()
        if not text: return ""
        text = text[0].upper() + text[1:]

        # 6. VIẾT HOA SAU DẤU CHẤM, HỎI, THAN
        # Regex tìm dấu kết thúc câu, khoảng trắng, và 1 chữ cái (bao gồm cả chữ có dấu VN)
        def uppercase_match(m):
            return m.group(1) + m.group(2).upper()
        
        # Hỗ trợ toàn bộ ký tự tiếng Việt Unicode
        text = re.sub(r'([.!?]\s+)([a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ])', 
                      uppercase_match, text)

        return text

    def convert(self, text):
        if not text: return ""
        
        matches = []
        for end_index, (length, value) in self.automaton.iter(text):
            start_index = end_index - length + 1
            matches.append((start_index, end_index, value))
        
        if not matches: return text
        matches.sort(key=lambda x: (x[0], -(x[1] - x[0])))
        
        final_output = []
        last_idx = 0
        for start, end, value in matches:
            if start < last_idx: continue
            if start > last_idx:
                final_output.append(text[last_idx:start])
            final_output.append(value + " ") # Thêm cách để tránh dính
            last_idx = end + 1
            
        final_output.append(text[last_idx:])
        return self.post_process("".join(final_output))

translator = VietPhraseTranslator()

def translate_text(text, limit=None):
    if not text: return ""
    if limit: text = text[:limit]
    # Tiền xử lý bỏ xuống dòng để dịch mượt hơn
    text = text.replace('\n', ' ').replace('\r', '')
    return translator.convert(text)
