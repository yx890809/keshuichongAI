import json
import os

def generate_groups(total_numbers=10000, group_count=8):
    """
    生成黄金分割分组

    参数:
        total_numbers: 总数字数量 (默认10000，对应0000-9999)
        group_count: 分组数量 (默认8组)

    返回:
        groups: 包含8个分组的字典
    """
    groups = {}

    for group_id in range(group_count):
        groups[group_id] = []

    for number in range(total_numbers):
        missing_group = number % group_count
        for group_id in range(group_count):
            if group_id != missing_group:
                groups[group_id].append(number)

    return groups

def format_number(num, digits=4):
    """
    将数字格式化为指定位数的字符串，前面补零
    """
    return str(num).zfill(digits)

def save_groups_to_files(groups, output_dir='groups'):
    """
    将分组保存到文件
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    total_groups = len(groups)

    for group_id, numbers in groups.items():
        filename = os.path.join(output_dir, f'组{group_id + 1}.txt')
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"=== 第{group_id + 1}组 ===\n")
            f.write(f"包含数字数量: {len(numbers)}\n")
            f.write(f"占总数比例: {(len(numbers)/10000*100):.1f}%\n")
            f.write(f"缺失的数字模值: {group_id}\n")
            f.write("=" * 30 + "\n\n")

            formatted_numbers = [format_number(n) for n in numbers]
            f.write('\n'.join(formatted_numbers))

        print(f"已保存: {filename}")

    print(f"\n共生成 {total_groups} 个分组文件")

def save_groups_json(groups, filename='groups.json'):
    """
    将分组保存为JSON格式
    """
    formatted_groups = {}
    for group_id, numbers in groups.items():
        formatted_groups[f'组{group_id + 1}'] = [format_number(n) for n in numbers]

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(formatted_groups, f, ensure_ascii=False, indent=2)

    print(f"已保存JSON文件: {filename}")

def verify_groups(groups):
    """
    验证分组是否满足条件
    """
    total_groups = len(groups)
    all_numbers = set()

    for group_id, numbers in groups.items():
        all_numbers.update(numbers)

    print(f"验证结果:")
    print(f"总组数: {total_groups}")
    print(f"覆盖数字总数: {len(all_numbers)}")
    print(f"每组大小: {len(groups[0])}")

    valid = True

    if len(all_numbers) != 10000:
        print("[错误] 未覆盖全部10000个数字")
        valid = False

    for i in range(total_groups):
        union = set()
        for j in range(total_groups):
            if i != j:
                union.update(groups[j])

        if len(union) != 10000:
            print(f"[错误] 缺少组{i+1}时，其余7组无法覆盖全集")
            valid = False

    if valid:
        print("[成功] 验证通过！所有条件都满足")

    return valid

def main():
    print("=" * 50)
    print("    体彩排列5黄金分割分组程序")
    print("=" * 50)
    print()
    print("功能说明:")
    print("  将0000-9999这10000个数字分成8组")
    print("  任意7组的并集包含全部10000个数字")
    print("  每个数字恰好缺席其中一组")
    print()

    print("正在生成分组...")
    groups = generate_groups(10000, 8)

    print("\n分组统计:")
    for group_id, numbers in groups.items():
        print(f"  组{group_id + 1}: {len(numbers)} 个数字")

    print("\n正在验证分组...")
    verify_groups(groups)

    print("\n正在保存文件...")
    save_groups_to_files(groups)
    save_groups_json(groups)

    print("\n" + "=" * 50)
    print("    程序执行完成！")
    print("=" * 50)
    print("\n文件保存位置:")
    print("  - 分组文本文件: ./groups/ 目录")
    print("  - JSON格式文件: ./groups.json")

if __name__ == '__main__':
    main()