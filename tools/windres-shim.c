/* windres-shim.c
 * 解决 GNU windres（ANSI 程序）无法打开含非 ASCII 字符路径的图标文件的问题。
 * 思路：解析 embed-resource 传入的 --input <resource.rc> 参数，
 * 1) 用 Unicode(W) API 把 .rc 中 ICON 行引用的源图标复制到 .rc 同目录（ASCII 路径）app_icon.ico；
 * 2) 把 .rc 中 ICON 行路径改写为 app_icon.ico（相对路径，windres 可经 include-dir 找到）；
 * 3) 以相同参数调用真实 windres（通过 PATH 查找 "windres.exe"，本 shim 不叫 windres.exe，不会递归）。
 */
#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int run_windres(int argc, char **argv) {
    /* 真实 windres 的完整路径（UTF-8 字节转义，避免源码编码问题）。
     * 永雏塔菲 = E6B0B8 E99B8F E5A194 E88FB2 */
    const char *real_utf8 = "c:\\Users\\\xE6\xB0\xB8\xE9\x9B\x8F\xE5\xA1\x94\xE8\x8F\xB2"
                            "\\Desktop\\xiangqi\\.mingw\\mingw64\\bin\\windres.exe";
    wchar_t mod[MAX_PATH];
    int mlen = MultiByteToWideChar(CP_UTF8, 0, real_utf8, -1, mod, MAX_PATH);
    if (mlen <= 0) return 2;
    /* 用 CreateProcessW 以 UTF-16 命令行启动真实 windres；cmdline 首 token 必须是 windres 自身路径（windres 会据此推导预处理器名） */
    wchar_t *cmdline;
    size_t cap = 64 + wcslen(mod) * 2;
    int i;
    for (i = 1; i < argc; i++) {
        cap += strlen(argv[i]) * 2 + 4;
    }
    cmdline = malloc(cap * sizeof(wchar_t));
    wcscpy(cmdline, L"\"");
    wcscat(cmdline, mod);
    wcscat(cmdline, L"\"");
    for (i = 1; i < argc; i++) {
        wchar_t argw[4096];
        int n = MultiByteToWideChar(CP_ACP, 0, argv[i], -1, argw, 4096);
        if (n <= 0) continue;
        if (cmdline[0]) wcscat(cmdline, L" ");
        /* 简单引号包裹：参数中可能含空格 */
        wcscat(cmdline, L"\"");
        wcscat(cmdline, argw);
        wcscat(cmdline, L"\"");
    }
    STARTUPINFOW si;
    PROCESS_INFORMATION pi;
    memset(&si, 0, sizeof(si));
    si.cb = sizeof(si);
    si.dwFlags = STARTF_USESTDHANDLES;
    si.hStdInput = GetStdHandle(STD_INPUT_HANDLE);
    si.hStdOutput = GetStdHandle(STD_OUTPUT_HANDLE);
    si.hStdError = GetStdHandle(STD_ERROR_HANDLE);
    memset(&pi, 0, sizeof(pi));
    BOOL ok = CreateProcessW(mod, cmdline, NULL, NULL, TRUE,
                             CREATE_NO_WINDOW, NULL, NULL, &si, &pi);
    if (!ok) {
        fprintf(stderr, "windres-shim: cannot spawn %ls (err=%lu)\n", mod, GetLastError());
        return 2;
    }
    WaitForSingleObject(pi.hProcess, INFINITE);
    DWORD code = 0;
    GetExitCodeProcess(pi.hProcess, &code);
    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
    return (int)code;
}

int main(int argc, char **argv) {
    const char *input = NULL;
    int i;
    for (i = 1; i < argc - 1; i++) {
        if (strcmp(argv[i], "--input") == 0) {
            input = argv[i + 1];
        }
    }
    if (!input) {
        return run_windres(argc, argv);
    }

    FILE *f = fopen(input, "rb");
    if (!f) {
        return run_windres(argc, argv);
    }
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    fseek(f, 0, SEEK_SET);
    char *buf = (char *)malloc((size_t)sz + 1);
    if (!buf) { fclose(f); return run_windres(argc, argv); }
    if (fread(buf, 1, (size_t)sz, f) != (size_t)sz) { fclose(f); return run_windres(argc, argv); }
    fclose(f);
    buf[sz] = 0;

    char *icon_line = strstr(buf, "ICON \"");
    if (!icon_line) {
        return run_windres(argc, argv);
    }
    char *p = icon_line + 6; /* 跳过 ICON " */
    char *end = strchr(p, '"');
    if (!end || end == p) {
        return run_windres(argc, argv);
    }

    /* 源图标路径：UTF-8 字节 -> UTF-16 */
    int wlen = MultiByteToWideChar(CP_UTF8, 0, p, (int)(end - p), NULL, 0);
    if (wlen <= 0) {
        return run_windres(argc, argv);
    }
    wchar_t *wpath = (wchar_t *)malloc(((size_t)wlen + 1) * sizeof(wchar_t));
    MultiByteToWideChar(CP_UTF8, 0, p, (int)(end - p), wpath, wlen);
    wpath[wlen] = 0;

    /* 目标：<rc 同目录>\app_icon.ico（ASCII 路径） */
    char outpath[2048];
    strncpy(outpath, input, 2047);
    outpath[2047] = 0;
    char *slash = strrchr(outpath, '\\');
    if (!slash) slash = strrchr(outpath, '/');
    if (slash) *(slash + 1) = 0; else outpath[0] = 0;
    strncat(outpath, "app_icon.ico", 2047 - strlen(outpath));

    wchar_t wout[2048];
    MultiByteToWideChar(CP_ACP, 0, outpath, -1, wout, 2048);

    HANDLE src = CreateFileW(wpath, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, 0, NULL);
    if (src == INVALID_HANDLE_VALUE) {
        /* 复制失败则原样传递，让真实 windres 自行报错 */
        return run_windres(argc, argv);
    }
    DWORD szf = GetFileSize(src, NULL);
    char *idata = (char *)malloc(szf ? szf : 1);
    DWORD rd = 0;
    ReadFile(src, idata, szf, &rd, NULL);
    CloseHandle(src);
    HANDLE dst = CreateFileW(wout, GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, 0, NULL);
    if (dst == INVALID_HANDLE_VALUE) {
        free(idata);
        return run_windres(argc, argv);
    }
    DWORD wr = 0;
    WriteFile(dst, idata, szf, &wr, NULL);
    CloseHandle(dst);
    free(idata);

    /* 改写 .rc：ICON 路径 -> app_icon.ico */
    size_t plen = (size_t)(end - p);
    const char *newpath = "app_icon.ico";
    size_t newlen = strlen(newpath);
    size_t pre = (size_t)(p - buf);
    size_t nsz = pre + newlen + (size_t)(buf + sz - end);
    char *nbuf = (char *)malloc(nsz);
    memcpy(nbuf, buf, pre);
    memcpy(nbuf + pre, newpath, newlen);
    memcpy(nbuf + pre + newlen, end, (size_t)(buf + sz - end));
    FILE *fo = fopen(input, "wb");
    if (fo) {
        fwrite(nbuf, 1, nsz, fo);
        fclose(fo);
    }
    free(nbuf);
    free(buf);
    free(wpath);

    return run_windres(argc, argv);
}
