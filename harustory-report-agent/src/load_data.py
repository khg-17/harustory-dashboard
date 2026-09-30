import pandas as pd
from pathlib import Path
from typing import Dict, Any, Tuple
try:
    import yaml
except ImportError:
    yaml = None
import json

def load_config(config_path: str) -> Dict[str, Any]:
    """YAML 또는 JSON 설정 파일을 로드합니다."""
    path = Path(config_path)
    if not path.exists():
        raise FileNotFoundError(f"설정 파일을 찾을 수 없습니다: {config_path}")
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    if yaml is not None:
        return yaml.safe_load(content)
    else:
        # yaml 라이브러리가 없는 환경에서도 json 포맷 읽기 지원
        try:
            return json.loads(content)
        except Exception:
            raise ImportError("PyYAML 라이브러리가 설치되지 않았습니다. 'pip install pyyaml'을 실행하거나 JSON 포맷을 사용해주세요.")


def load_metrics_csv(csv_path: str) -> pd.DataFrame:
    """
    CSV 파일에서 지표 데이터를 읽어오고 유효성을 검사합니다.
    필수 컬럼: week, metric_id, metric_name, value, unit
    """
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"데이터 파일을 찾을 수 없습니다: {csv_path}")

    df = pd.read_csv(path)
    required_cols = {'week', 'metric_id', 'metric_name', 'value', 'unit'}
    missing_cols = required_cols - set(df.columns)
    if missing_cols:
        raise ValueError(f"CSV에 필수 컬럼이 누락되었습니다: {missing_cols}")

    # 데이터 타입 변환 및 정렬
    df['value'] = pd.to_numeric(df['value'], errors='coerce')
    df = df.sort_values(by=['metric_id', 'week']).reset_index(drop=True)
    return df
