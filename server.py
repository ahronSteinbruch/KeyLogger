from flask import Flask, request

server = Flask(__name__)

@server.route('/')
def hello_world():
    return 'Hello, World!'

@server.route('/upload', methods=['GET', 'POST'])
def upload_file():
    if request.method == 'POST':
        file = request.files['file']
        file.save(f"./uploads/{file.filename}")
        return f"File {file.filename} uploaded successfully!"
    return '''
    <!doctype html>
    <title>Upload File</title>
    <h1>Upload new File</h1>
    <form method=post enctype=multipart/form-data>
      <input type=file name=file>
      <input type=submit value=Upload>
    </form>
    '''

if __name__ == '__main__':
    server.run(debug=True)