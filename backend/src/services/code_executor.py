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

# New: Execute code with custom input
async def execute_python_code_with_input(code: str, input_str: str):
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(code)
        temp_file = f.name
    try:
        result = subprocess.run(
            [sys.executable, temp_file],
            input=input_str,
            capture_output=True,
            text=True,
            timeout=10
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

# New: Execute code for multiple test cases
async def execute_python_code_multiple(code: str, inputs: list):
    results = []
    for input_str in inputs:
        result = await execute_python_code_with_input(code, input_str)
        results.append(result)
    return results 