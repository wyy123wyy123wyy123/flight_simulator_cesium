import os

def summarize_jsx_files(root_dir, output_file):
    """
    查找目录及其子目录中的所有 .jsx 文件，
    并将其内容编译成一个文本文件。

    参数:
        root_dir (str): 要搜索的根目录的路径。
        output_file (str): 输出汇总文本文件的路径。
    """
    try:
        with open(output_file, 'w', encoding='utf-8') as outfile:
            # 遍历根目录下的所有文件和文件夹
            for dirpath, dirnames, filenames in os.walk(root_dir):
                # 排除 node_modules 文件夹
                dirnames[:] = [d for d in dirnames if d != 'node_modules']
                
                for filename in filenames:
                    # 检查文件扩展名是否为 .jsx或.js
                    if filename.endswith('.jsx') or filename.endswith('.js'):
                        full_path = os.path.join(dirpath, filename)
                        # 获取相对于根目录的路径
                        relative_path = os.path.relpath(full_path, root_dir)
                        
                        # 为了跨平台兼容性，将路径分隔符统一为 '/'
                        relative_path = relative_path.replace(os.path.sep, '/')

                        print(f"正在处理: {relative_path}")

                        # 写入文件头，包含相对路径
                        outfile.write(f"--- File: {relative_path} ---\n\n")
                        
                        try:
                            # 读取 .tsx 文件内容并写入汇总文件
                            with open(full_path, 'r', encoding='utf-8') as infile:
                                content = infile.read()
                                outfile.write(content)
                        except Exception as e:
                            outfile.write(f"读取文件时出错: {e}\n")
                        
                        # 写入文件尾
                        outfile.write(f"\n\n--- End of File: {relative_path} ---\n\n")
        print(f"\n汇总文件已成功创建: {output_file}")
    except Exception as e:
        print(f"发生错误: {e}")

if __name__ == "__main__":
    # --- 配置 ---
    target_directory = '.'

    # 设置输出文件名
    output_filename = './code_summary.txt'

    summarize_jsx_files(target_directory, output_filename)