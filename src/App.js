import React, { useState, useRef, useEffect } from "react";
import {
  Button,
  Input,
  useToast,
  Box,
  Heading,
  VStack,
  Container,
  Text,
  Stack,
} from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { format } from "sql-formatter";

const App = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sqlQuery, setSqlQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const answerRef = useRef(null);

  const prompts = [
    "What is the cheapest flight from New Delhi to Hanoi?",
    "Find the cheapest round trip from New Delhi to Hanoi?",
    "Find the cheapest return flight between New Delhi and Hanoi with at least 7 days gap?",
    "List round trip flights between Mumbai and Phu Quoc?",
  ];

  const processText = (text) => {
    // Remove think tags and their content
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '');
    
    // Add space after punctuation marks if not followed by a space
    text = text.replace(/([.,!?)])([^\s])/g, '$1 $2');
    
    // Add space before opening parenthesis if not preceded by a space
    text = text.replace(/([^\s])\(/g, '$1 (');
    
    // Ensure proper spacing in markdown tables
    text = text.replace(/\|([^\s|])/g, '| $1');
    text = text.replace(/([^\s|])\|/g, '$1 |');
    
    // Fix markdown headers spacing
    text = text.replace(/###([^\s])/g, '### $1');
    
    // Ensure proper spacing for bold text
    text = text.replace(/\*\*([^\s])/g, '** $1');
    text = text.replace(/([^\s])\*\*/g, '$1 **');

    return text;
  };

  useEffect(() => {
    if (answerRef.current && loading) {
      answerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [answer, loading]);

  const handleSubmit = async (query) => {
    const currentQuestion = query || question;

    if (!currentQuestion.trim()) {
      toast({
        title: "Please enter a question",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    setAnswer("");
    setSqlQuery("");
    
    try {
      const eventSource = new EventSource(`http://localhost:8000/stream?question=${encodeURIComponent(currentQuestion)}`);
      let currentAnswer = "";
      
      eventSource.onmessage = (event) => {
        try {
          const cleanData = event.data.replace(/^data:\s*/, '');
          if (!cleanData) return;

          const data = JSON.parse(cleanData);
          
          if (data.type === 'answer') {
            currentAnswer += data.content;
            const processedText = processText(currentAnswer);
            setAnswer(processedText);
          } else if (data.type === 'sql') {
            try {
              const formattedSql = format(data.content, {
                language: "mysql",
                indent: "  ",
              });
              setSqlQuery(formattedSql);
            } catch (sqlError) {
              console.error('SQL formatting error:', sqlError);
              setSqlQuery(data.content);
            }
          }
        } catch (parseError) {
          console.error('Parse error:', parseError, 'Raw data:', event.data);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close();
        setLoading(false);
        toast({
          title: "Error in streaming response",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      };

      eventSource.addEventListener('done', () => {
        eventSource.close();
        setLoading(false);
      });

    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Error querying the API",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setLoading(false);
    }
  };

  return (
    <Container maxW="container.md" mt={8}>
      <VStack spacing={6}>
        <Box w="full">
          <Heading as="h1" size="xl" textAlign="center" mb={4}>
            Flight Query
          </Heading>
          <Text textAlign="center" color="gray.500">
            Ask about the cheapest flights from one city to another
          </Text>
        </Box>

        <Box w="full" bg="white" p={6} boxShadow="md" borderRadius="md">
          <Input
            as="textarea"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about flights"
            size="lg"
            mb={2}
            variant="filled"
            resize="none"
            rows={2}
            overflow="hidden"
            whiteSpace="pre-wrap"
            style={{ height: "auto" }}
          />
          <Button
            isLoading={loading}
            loadingText="Searching"
            colorScheme="blue"
            onClick={() => handleSubmit()}
            w="full"
          >
            Submit
          </Button>
        </Box>

        {(answer || loading) && (
          <Box w="full" p={6} bg="white" boxShadow="md" borderRadius="md">
            <Heading as="h3" size="md" mb={4}>
              Answer:
            </Heading>
            <Box 
              ref={answerRef}
              overflowX="auto" 
              className="markdown-body"
              css={{
                '& table': {
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginBottom: '1rem',
                  tableLayout: 'fixed'
                },
                '& th, & td': {
                  border: '1px solid #ddd',
                  padding: '8px',
                  textAlign: 'left',
                  wordWrap: 'break-word'
                },
                '& th': {
                  backgroundColor: '#f5f5f5'
                },
                '& h3': {
                  marginTop: '1rem',
                  marginBottom: '0.5rem'
                },
                '& p': {
                  marginBottom: '1rem',
                  lineHeight: '1.5'
                }
              }}
            >
              <ReactMarkdown 
                children={answer || "Generating response..."} 
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({node, ...props}) => (
                    <div style={{overflowX: 'auto', width: '100%'}}>
                      <table {...props} />
                    </div>
                  )
                }}
              />
            </Box>
          </Box>
        )}

        {(sqlQuery || loading) && (
          <Box w="full" p={6} bg="white" boxShadow="md" borderRadius="md">
            <Heading as="h3" size="md" mb={4}>
              SQL Query:
            </Heading>
            <Box overflowX="auto">
              <SyntaxHighlighter language="sql" style={atomDark}>
                {sqlQuery || "Generating query..."}
              </SyntaxHighlighter>
            </Box>
          </Box>
        )}

        <Box w="full" bg="white" p={6} boxShadow="md" borderRadius="md">
          <Heading as="h3" size="md" mb={4}>
            Predefined Prompts:
          </Heading>
          <Stack spacing={3}>
            {prompts.map((prompt, index) => (
              <Button
                key={index}
                colorScheme="teal"
                variant="outline"
                w="full"
                textAlign="left"
                whiteSpace="normal"
                wordBreak="break-word"
                onClick={() => {
                  setQuestion(prompt);
                  handleSubmit(prompt);
                }}
              >
                {prompt}
              </Button>
            ))}
          </Stack>
        </Box>
      </VStack>
    </Container>
  );
};

export default App;