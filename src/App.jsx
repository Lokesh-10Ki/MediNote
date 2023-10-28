import { useEffect, useState, useRef } from "react";
//import axios from "axios";
import OpenAI from "openai";
import { EditIcon, AddIcon } from "@chakra-ui/icons";
import {
  BsMicFill,
  BsFillPauseFill,
  BsFillPlayFill,
  BsStopFill,
} from "react-icons/bs";
 
import {
  Button,
  Box,
  HStack,
  VStack,
  Tabs,
  Tab,
  TabPanels,
  TabPanel,
  TabList,
  Text,
  Flex,
  Input,
  InputGroup,
  InputRightElement,
  Select,
} from "@chakra-ui/react";
import {
  AudioConfig,
  SpeechConfig,
  SpeechRecognizer,
} from "microsoft-cognitiveservices-speech-sdk";

const azureApiKey = import.meta.env.VITE_REACT_APP_AZURE_API_KEY;
const azureApiLocation = import.meta.env.VITE_REACT_APP_AZURE_API_LOCATION;
const gptApiKey = import.meta.env.VITE_REACT_APP_GPT_KEY;


// this will be used for continuous speech recognition
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

const speechConfig = SpeechConfig.fromSubscription(azureApiKey, azureApiLocation);

// recognizer must be a global variable
let recognizer;

function App() {
  //const [recognisedText, setRecognisedText] = useState("");
  //const [recognisingText, setRecognisingText] = useState("");
  const currentDate = new Date();
  const [sentences, setSentences] = useState([]);
  const [report, setReport] = useState("");
  const [isRecognising, setIsRecognising] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [title, setTitle] = useState(
    `Consultation - ${currentDate.getMonth() + 1}/${currentDate.getDate()}`
  );
  //const [isStopped, setIsStopped] = useState(false);
  const [notetype, setNotetype] = useState("Summary");
  const [template, setTemplate] = useState(
    "Multiple sections like chief complaint, HPI, past medical history, social history, allergies, physical exam, prescriptions..."
  );
  const [style, setStyle] = useState("Descriptive");
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [created, setCreated] = useState("");
  const hasStartTimeSetRef = useRef(false);
  const textRef = useRef();
  let startTime = 0;
  const toggleListener = () => {
    if (!isRecognising) {
      console.log("outer if");
      if (sentences.legth > 0) {
        console.log("inner if");
        console.log("sentences.legth" + sentences.legth);
        startRecognizer();
        setIsPaused(false);
        console.log(isRecognising);
        console.log("---------------------------");
      } else {
        console.log("inner else");
        console.log("sentences.legth" + sentences.legth);
        startRecognizer();
        setIsPaused(false);
        //setSentences([]); // Clear previous sentences
        //        startTime = 0;
        console.log("isRecognising : " + isRecognising);
        console.log("---------------------------");
      }
    } else {
      console.log("outer else");
      stopRecognizer();
      console.log("sentences.legth" + sentences.legth);
      console.log("isRecognising : " + isRecognising);
      console.log("---------------------------");
    }
  };

  useEffect(() => {
    var constraints = {
      video: false,
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        sampleSize: 16,
        volume: 1,
      },
    };
    const getMedia = async (constraints) => {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        createRecognizer(stream);
      } catch (err) {
        alert(err);
        console.log(err);
      }
    };

    getMedia(constraints);
  }, []);

  const addSentenceWithTimestamp = (text) => {
    console.log("4. startTime : " + startTime);
    const timestamp = new Date(startTime * 1000).toISOString().substr(14, 5);
    console.log("5. startTime : " + startTime);
    setSentences((prevSentences) => [
      ...prevSentences,
      `${timestamp}: ${text}`,
    ]);
  };

  // this function will create a speech recognizer based on the audio Stream
  // NB -> it will create it, but not start it
  const createRecognizer = (audioStream) => {
    // configure Azure STT to listen to an audio Stream
    const audioConfig = AudioConfig.fromStreamInput(audioStream);

    // recognizer is a global variable
    recognizer = new SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognizing = () => {
      // uncomment to debug
      // console.log(`RECOGNIZING: Text=${e.result.text}`)
      //setRecognisingText(e.result.text);
      textRef.current.scrollTop = textRef.current.scrollHeight;
    };

    recognizer.recognized = (s, e) => {
      //setRecognisingText("");
      console.log("1. startTime : " + startTime);
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
        console.log("2. startTime : " + startTime);
        addSentenceWithTimestamp(e.result.text);
        startTime = e.result.offset / 10000000; // Convert to seconds
        console.log("3. startTime : " + startTime);
      } else if (e.result.reason === sdk.ResultReason.NoMatch) {
        console.log("NOMATCH: Speech could not be recognized.");
      }
    };

    recognizer.canceled = (s, e) => {
      console.log(`CANCELED: Reason=${e.reason}`);

      if (e.reason === sdk.CancellationReason.Error) {
        console.log(`"CANCELED: ErrorCode=${e.errorCode}`);
        console.log(`"CANCELED: ErrorDetails=${e.errorDetails}`);
        console.log(
          "CANCELED: Did you set the speech resource key and region values?"
        );
      }
      recognizer.stopContinuousRecognitionAsync();
    };

    recognizer.sessionStopped = () => {
      console.log("Session stopped.");
      recognizer.stopContinuousRecognitionAsync();
    };
  };

  // this function will start a previously created speech recognizer
  const startRecognizer = () => {
    recognizer.startContinuousRecognitionAsync();
    setIsRecognising(true);
    if (!hasStartTimeSetRef.current) {
      const now = new Date();
      setCreated(now);
      hasStartTimeSetRef.current = true;
    }
    console.log(hasStartTimeSetRef);
    console.log("created" + created);
  };

  // this function will stop a running speech recognizer
  const stopRecognizer = () => {
    if (sentences.length > 0) {
      pauseRecognizer();
      setIsRecognising(false);
    } else {
      setIsRecognising(false);
      recognizer.stopContinuousRecognitionAsync();
    }
  };

  const startNewConsultation = () => {
    setIsRecognising(false);
    setIsPaused(false);
    recognizer.stopContinuousRecognitionAsync();
    setSentences([]);
    setReport([]);
  };

  const pauseRecognizer = () => {
    if (sentences == "") {
      stopRecognizer();
      setIsRecognising(false);
    } else {
      console.log("pause" + isPaused);
      setIsPaused(true);
      recognizer.stopContinuousRecognitionAsync();
    }
  };

  const resumeRecognizer = () => {
    console.log("resume" + isPaused);
    setIsPaused(false);
    startRecognizer();
  };

  const export2txt = (text, type) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    if (type == "transcript") {
      link.download = "transcription.pdf";
    }
    if (type == "note") {
      link.download = "note.pdf";
    }
    link.href = url;
    link.click();
  };

  const generatePrompt = (transcript) => {
    console.log(style);
    console.log(template);
    console.log(notetype);
    setPrompt(`Generate a detailed official medical Summary note for the following interaction between doctor and patient and the conversation is not diarized : 
          ${transcript}. 
          Please use the information provided to generate a detailed medical ${notetype} note, adhering to the following template:
          ${template}, in ${style} style.`);

    return prompt;
  };

  const openai = new OpenAI({
    apiKey: gptApiKey,
    dangerouslyAllowBrowser: true,
  });

  const generateReport = async () => {
    setIsLoading(true);
    const conversation = [
      {
        role: "system",
        content:
          "You are a medical assistant who creates reports and notes from the doctor-patient transcriptions.",
      },
      
      
    ];

    // Assuming sentences is the transcription text from your previous conversation
    const promptText = generatePrompt(sentences);
    conversation.push({ role: "user", content: promptText });
    conversation.push({ role: "assistant", content: `if any information that you need for the progress note is missing, 
          put *** as place holder there. Don't add any creative data, strictly adhere to the data in the conversation alone and generate the user requested medical note.`});
    console.log("prompt" + promptText);
    const completion = await openai.chat.completions.create({
      messages: conversation,
      model: "gpt-3.5-turbo",
    });
    setReport(
      JSON.stringify(completion.choices[0].message.content, null, 2)
    );
    console.log(report);

    setIsLoading(false);
  };

  return (
    <Box bgColor="#f7fafc">
      <Tabs isLazy orientation="vertical" variant="unstyled">
        <TabList
          w="20%"
          bgColor="#f7fafc"
          m="5px"
          minH="690px"
          pr="3px"
          borderRight="1px"
          borderColor="#E9EBEC"
        >
          <Text
            fontWeight="bold"
            fontSize="25px"
            pl="6px"
            style={{ pointerEvents: "none" }}
            background="linear-gradient(to top, white,#4fd1c5,teal)"
            backgroundClip="text"
            opacity="0.8"
            pt="15px"
            pb="15px"
          >
            MediNote
          </Text>
          <Tab
            _selected={{ color: "white", bgColor: "#4fd1c5" }}
            m="5px"
            borderRadius="9px"
            _hover={{ bgColor: "teal.200" }}
          >
            Current Consultation
          </Tab>
          <Tab
            _selected={{ color: "white", bgColor: "#4fd1c5" }}
            m="5px"
            borderRadius="9px"
            _hover={{ bgColor: "teal.200" }}
          >
            Previous Consultations
          </Tab>
        </TabList>
        <TabPanels pt="20px">
          <TabPanel>
            <HStack>
              <Flex justify="left" w="40%" >
                <HStack left="-40rem">
                  <InputGroup w="450px">
                    <Input
                      variant="filled"
                      value={title}
                      color="gray.300"
                      focusBorderColor="gray.200"
                      textColor="black"
                      onChange={(event) => setTitle(event.target.value)}
                      fontWeight="semibold"
                      fontSize="25px"
                      pr="10px"
                      _hover={{ bgColor: "gray.200" }}
                    />
                    <InputRightElement>
                      <EditIcon color="gray.400" />
                    </InputRightElement>
                  </InputGroup>
                </HStack>
              </Flex>
              <Flex justify="flex-end" w="60%" pr="17px">
                {/* {created && <Text>Start Time: {created.toLocaleString()}</Text>} */}
                <HStack spacing="10">
                  {isRecognising && (
                    <Button
                      variant="solid"
                      bgColor="#4fd1c5"
                      color="white"
                      _hover={{ bgColor: "teal.200" }}
                      onClick={() =>
                        isPaused ? resumeRecognizer() : pauseRecognizer()
                      }
                      w="200px"
                      leftIcon={
                        isPaused ? <BsFillPlayFill /> : <BsFillPauseFill />
                      }
                    >
                      {isPaused ? "Resume" : "Pause"}
                    </Button>
                  )}
                  <Button
                    bgColor={isRecognising ? "red" : "#4fd1c5"}
                    onClick={() => toggleListener()}
                    w="200px"
                    color="white"
                    _hover={{ bgColor: isRecognising ? "red.400" : "teal.200" }}
                    leftIcon={
                      isRecognising ? (
                        <BsStopFill />
                      ) : sentences.length > 0 ? (
                        <BsFillPlayFill />
                      ) : (
                        <BsMicFill />
                      )
                    }
                  >
                    {isRecognising
                      ? "Stop"
                      : sentences.length > 0
                      ? "Resume"
                      : "Start"}
                  </Button>
                  {isLoading ? (
                    <Button isLoading variant="solid" w="200px"></Button>
                  ) : (
                    sentences.length > 0 &&
                    !isRecognising && (
                      <Button
                        variant="solid"
                        onClick={() => generateReport()}
                        w="200px"
                        bgColor="black"
                        color="white"
                        _hover={{ bgColor: "gray" }}
                      >
                        Generate note
                      </Button>
                    )
                  )}
                  <Button
                    variant="solid"
                    onClick={() => startNewConsultation()}
                    w="200px"
                    bgColor="black"
                    color="white"
                    _hover={{ bgColor: "gray" }}
                    leftIcon={<AddIcon />}
                  >
                    New consultation
                  </Button>
                </HStack>
              </Flex>
            </HStack>
            <Box pt="20px">
              <Tabs isLazy>
                <TabList>
                  <Tab>Transcript</Tab>
                  <Tab>Note</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel>
                    <Box>
                      {sentences.map((sentence, index) => (
                        <div key={index}>{sentence}</div>
                      ))}
                    </Box>
                    {sentences.length > 0 && (
                      <Box
                        position="fixed"
                        bottom="2rem"
                        right="2rem"
                        zIndex="1"
                        textAlign="right"
                      >
                        <Button
                          variant="solid"
                          bgColor="black"
                          color="white"
                          onClick={() => export2txt(sentences, "transcript")}
                          _hover={{ bgColor: "gray" }}
                        >
                          Download Transcript
                        </Button>
                      </Box>
                    )}
                  </TabPanel>
                  <TabPanel>
                    <HStack>
                      <Box w="75%">
                        {report.length > 0 ? (
                          <Box
                            dangerouslySetInnerHTML={{
                              __html: report.replace(/\\n/g, "<br>"),
                            }}
                          ></Box>
                        ) : (
                          <Box></Box>
                        )}
                      </Box>
                      {sentences.length > 0 && !isRecognising && (
                        <VStack
                          w="270px"
                          position="fixed"
                          top="10rem"
                          right="2rem"
                        >
                          <Select
                            value={notetype}
                            onChange={(e) => setNotetype(e.target.value)}
                            w="240px"
                          >
                            <option value="Summary">Summary</option>
                            <option value="Admission">Admission</option>
                            <option value="Daily progress">
                              Daily progress
                            </option>
                            <option value="Consultation">Consultation</option>
                          </Select>

                          <Select
                            value={template}
                            onChange={(e) => setTemplate(e.target.value)}
                            w="240px"
                          >
                            <option value="Multiple sections like chief complaint, HPI, past medical history, social history, allergies, physical exam, prescriptions...">
                              Default (multiple sections)
                            </option>
                            <option value="SOAP format">SOAP</option>
                            <option value="SOAP with the Assessment & Plan section first.">
                              APSO
                            </option>
                            <option value="SOAP with 2 additional : Physical Exam and Diagnostic Tests Ordered.">
                              SOAP with PE and Tests
                            </option>
                          </Select>

                          <Select
                            value={style}
                            onChange={(e) => setStyle(e.target.value)}
                            w="240px"
                          >
                            <option value="Descriptive">Descriptive</option>
                            <option value="Bullets">Bullets</option>
                            <option value="Problem wise">Problem wise</option>
                            <option value="System wise">System wise</option>
                          </Select>
                          {report.length > 0 && (
                            <Box
                              position="fixed"
                              bottom="2rem"
                              right="2rem"
                              zIndex="1"
                              textAlign="right"
                            >
                              <Button
                                variant="solid"
                                bgColor="black"
                                color="white"
                                onClick={() => export2txt(sentences, "note")}
                                _hover={{ bgColor: "gray" }}
                              >
                                Download Note
                              </Button>
                            </Box>
                          )}
                        </VStack>
                      )}
                    </HStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Box>
          </TabPanel>
          <TabPanel>{/* <Box p={4}>Logout</Box> */}...</TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}

export default App;
