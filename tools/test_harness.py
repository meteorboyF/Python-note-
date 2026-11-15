# Shared test runner for write-a-program blocks. Expects _pn_src (the tests source).
import ast as _pn_ast
def raises(_exc, _fn, *_a, **_k):
    try:
        _fn(*_a, **_k)
    except _exc as _e:
        return str(_e) or True
    return False
_pn_pass = _pn_total = 0
_pn_failed = []
for _pn_node in _pn_ast.parse(_pn_src).body:
    _pn_text = _pn_ast.get_source_segment(_pn_src, _pn_node)
    _pn_code = compile(_pn_ast.Module([_pn_node], []), "<tests>", "exec")
    if not isinstance(_pn_node, _pn_ast.Assert):
        try:
            exec(_pn_code, globals())
        except Exception as _pn_e:
            _pn_failed.append(_pn_text)
            print("ERROR " + _pn_text.splitlines()[0] + "\n      " + type(_pn_e).__name__ + ": " + str(_pn_e))
        continue
    _pn_total += 1
    try:
        exec(_pn_code, globals())
        print("PASS  " + _pn_text); _pn_pass += 1
    except AssertionError:
        _pn_got = ""
        _pn_t = _pn_node.test
        if isinstance(_pn_t, _pn_ast.Compare) and len(_pn_t.ops) == 1 and isinstance(_pn_t.ops[0], _pn_ast.Eq):
            try:
                _pn_got = "\n      got: " + repr(eval(_pn_ast.get_source_segment(_pn_src, _pn_t.left), globals()))
            except Exception:
                pass
        _pn_failed.append(_pn_text)
        print("FAIL  " + _pn_text + _pn_got)
    except Exception as _pn_e:
        _pn_failed.append(_pn_text)
        print("ERROR " + _pn_text + "\n      " + type(_pn_e).__name__ + ": " + str(_pn_e))
print(f"SUMMARY {_pn_pass}/{_pn_total}")
