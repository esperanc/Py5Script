# ------- py5 compatibility hacks ------------

def remap(*args):
    return P5.map(*args)

def size(*args):
    canvas = P5.createCanvas(*args)
    P5.background(200)
    P5.fill('white')
    return canvas

def _make_p5_pair(begin_attr, end_attr, end_args=()):
    """
    Returns a class that calls beginXxx() on construction and endXxx() on
    context-manager exit, forwarding any arguments to the begin call.
    end_args may be a plain tuple (eager) or a zero-arg callable (lazy,
    used when the value is a P5 constant resolved at runtime).
    """
    class _Pair:
        def __init__(self, *args, **kwargs):
            getattr(P5, begin_attr)(*args, **kwargs)
        def __enter__(self):
            return self
        def __exit__(self, *_):
            resolved = end_args() if callable(end_args) else end_args
            getattr(P5, end_attr)(*resolved)
            return False
    _Pair.__name__ = begin_attr
    return _Pair

globals()['remap'] = remap
globals()['size'] = size
globals()['begin_shape'] = _make_p5_pair('beginShape',  'endShape')
globals()['begin_closed_shape'] = _make_p5_pair('beginShape',  'endShape', end_args=lambda: (P5.CLOSE,))
globals()['begin_contour'] = _make_p5_pair('beginContour',  'endContour')
globals()['push_matrix'] = _make_p5_pair('push',  'pop')
globals()['pop_matrix'] = lambda: P5.pop()
globals()['push_style'] = _make_p5_pair('push',  'pop')
globals()['pop_style'] = lambda: P5.pop()

P5Transformer.custom_aliases['is_mouse_pressed'] = 'mouseIsPressed'
P5Transformer.custom_aliases['is_key_pressed'] = 'keyIsPressed'
