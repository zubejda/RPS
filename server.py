import os
import tornado.ioloop
import tornado.web
from tornado.web import StaticFileHandler, RequestHandler
from tornado.websocket import WebSocketHandler
import numpy as np
import cv2, tempfile
import tensorflow as tf
from PIL import Image


class ProcessVideoHandler(WebSocketHandler):

    def open(self):
        print("WebSocket opened")

    def post(self):
        # recives the video data in bytes from the client and returns the prediction

        # Get the video data from the request
        video_data = self.request.body

        # Create a temporary file to save the video data
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp_file:
            tmp_file.write(video_data)
            tmp_file_path = tmp_file.name

        # Process the video and extract frames
        frames = self.extract_frames_from_video(tmp_file_path)

        # Get the prediction from the model
        get_models_prediction = self.get_models_prediction(frames)
        
        # Delete the temporary file
        os.remove(tmp_file_path)

        print(cls_inx[get_models_prediction[0]]) # prints the class name
        response = {"class": cls_inx[get_models_prediction[0]], "probability": str(get_models_prediction[1].round(2))}
        self.write(response) # Send response if needed

    def on_close(self):
        print("WebSocket closed")

    def get_models_prediction(self, frames):
        # iterates through the frames backwards and makes a prediction

        i = 1
        x = tf.convert_to_tensor(frames[-i])

        interpreter.set_tensor(input_details[0]['index'], x) # sets the input tensor
        interpreter.invoke() # Run the inference        
        y = interpreter.get_tensor(output_details[0]['index']) # Get the output tensor and post-process the result (if needed)
        prob = np.max(y)

        while prob < 0.8: # if the probability is less than 0.8, take the previous frame
            i += 1
            try:
                x = tf.convert_to_tensor(frames[-i]) # tries if there are any more frames left
            except:
                return None, None # if not there wasnt
            interpreter.set_tensor(input_details[0]['index'], x)
            interpreter.invoke() # Run the inference        
            y = interpreter.get_tensor(output_details[0]['index']) # Get the output tensor and post-process the result (if needed)
            prob = np.max(y)
            
        clss = np.argmax(y)
        return [clss, prob]

    def extract_frames_from_video(self, video_path):
        # returns a list of frames from the video

        print("Video processing started...")
        # Use OpenCV to extract frames from the video
        cap = cv2.VideoCapture(video_path) # opens the video file
        frames = []
        while cap.isOpened():
            ret, frame = cap.read() # reads the frame from the video
            if not ret:
                break
            frame = Image.fromarray(frame) # converts np array to PIL image for resizing
            frame = frame.resize((300,300))
            frame = np.asarray(frame) # converts image back to np array for input to the nn
            frame = frame.astype(np.float32)
            frame = np.expand_dims(frame, axis=0) # adds dimension for compability with nn
            frames.append(frame)

        cap.release() # closes the video file

        # print(len(frames))
        print("Video processing finished!")

        return frames

class MainHandler(RequestHandler):

    def get(self):
        self.render("web.html")

def make_app():
    return tornado.web.Application([
        (r"/", MainHandler),
        (r"/process_video", ProcessVideoHandler),
        (r"/static/(.*)", StaticFileHandler, {"path": "static"}),
    ])

if __name__ == "__main__":
    cls_inx = {0: "rock", 1: "paper", 2: "scissors"}

    # Load the TensorFlow Lite model
    interpreter = tf.lite.Interpreter(model_path='tflite_model.tflite')
    interpreter.allocate_tensors()

    # Get input and output tensors
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    # start the server
    app = make_app()
    app.listen(8888)
    print("running on port 8888")
    tornado.ioloop.IOLoop.current().start()