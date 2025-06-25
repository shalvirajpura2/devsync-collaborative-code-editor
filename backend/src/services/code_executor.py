import subprocess
import sys
import tempfile
import os

async def execute_python_code(code: str):
    """Executes Python code in a sandboxed environment."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(code)
        temp_file = f.name
    
    try:
        result = subprocess.run(
            [sys.executable, temp_file],
            capture_output=True,
            text=True,
            timeout=10  # 10 second timeout
        )
        
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
        
    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": "Error: Code execution timed out (10 seconds limit)",
            "returncode": 1
        }
    finally:
        os.unlink(temp_file) 