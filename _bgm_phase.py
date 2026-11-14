"""BGM 镜头边界对齐：给定 BPM，在 [0, period) 里搜第一拍相位，使 6 个镜头边界最接近节拍格。"""
BOUND = [0, 7, 17, 31, 43, 58, 70]  # 秒（SHOTS from / 30）
BPM = 123.0
p = 60.0 / BPM
best = None
n = 200000
for i in range(n):
    phi = p * i / n
    errs = [min((t - phi) % p, p - ((t - phi) % p)) for t in BOUND]
    score = sum(e * e for e in errs)
    if best is None or score < best[0]:
        best = (score, phi, errs)
score, phi, errs = best
print('BPM', BPM, 'period %.5fs = %.3f f@30' % (p, p * 30))
print('phase(first beat) %.4fs = %.2f f' % (phi, phi * 30))
print('per-boundary error (frames):', [round(e * 30, 2) for e in errs])
print('rms error frames %.2f' % ((score / len(errs)) ** 0.5 * 30))
# 同时给 bar(4拍) 对齐检查
print('bar period %.4fs' % (p * 4))
