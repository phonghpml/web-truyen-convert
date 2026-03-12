def split_file(file_name, num_parts=5):
    with open(file_name, 'r', encoding='utf-8-sig') as f:
        lines = f.readlines()

    total_lines = len(lines)
    lines_per_part = total_lines // num_parts

    for i in range(num_parts):
        start = i * lines_per_part
        # Phần cuối cùng lấy hết số dòng còn lại
        end = (i + 1) * lines_per_part if i < num_parts - 1 else total_lines
        
        with open(f'Vietphrase_{i+1}.txt', 'w', encoding='utf-8') as out:
            out.writelines(lines[start:end])
    print(f"✅ Đã chia xong thành {num_parts} file!")

split_file('Vietphrase.txt')
