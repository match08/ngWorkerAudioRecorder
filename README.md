# ngWorkerAudioRecorder


演示：https://match08.github.io/ngWorkerAudioRecorder/demo/www/demo1.html

demo中可以看到start来录音，stop来停止录音，getBuffer方法来获取录音的数据可以用于你的开发中（可以初始化init方法的时候config参数recordBufferService节点上扩展更多数据Buffer服务），exportWAV方法导出wav数据包，使用forceDownload可以下载exportWAV方法导出.wav格式

ngWorkerAudioRecorder开源移步：https://github.com/match08/ngWorkerAudioRecorder

项目中使用

bower安装： bower install https://github.com/match08/ngWorkerAudioRecorder.git --save

npm安装： npm install https://github.com/match08/ngWorkerAudioRecorder.git --save

config参数recordBufferService扩展更多数据Buffer服务方法，后面会写一篇依照“语音识别”为例子扩展。
