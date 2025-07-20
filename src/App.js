import React, { useState, useRef, useEffect } from "react";
import {
  Button,
  Input,
  useToast,
  Box,
  Heading,
  VStack,
  Text,
  Stack,
  Link,
  Spinner,
  Card,
  CardBody,
  Flex,
  IconButton,
  Wrap,
  WrapItem,
  SkeletonText,
  Divider,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { format } from "sql-formatter";

// --- Skeleton Loader Component ---
const ResultSkeleton = () => (
    <VStack spacing={4} align="stretch">
        <Card variant="outline"><CardBody><SkeletonText noOfLines={5} spacing="4" skeletonHeight="3" /></CardBody></Card>
        <Card variant="outline"><CardBody><SkeletonText noOfLines={5} spacing="4" skeletonHeight="3" /></CardBody></Card>
    </VStack>
);

// --- Main Application Component ---
const App = () => {
  // State Management
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sqlQuery, setSqlQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const resultsContainerRef = useRef(null);

  const prompts = [
    "Cheapest flight from Delhi to Hanoi?",
    "Round trip from Mumbai to HCMC.",
    "Direct flights from Bangalore?",
    "Flights from Ahmedabad with free meal?",
  ];

  const processSqlChunk = (chunk) => {
    try {
      return format(chunk, { language: "mysql", indent: "  " });
    } catch (sqlError) {
      return chunk;
    }
  };

  useEffect(() => {
    if (answer && resultsContainerRef.current) {
      resultsContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [answer]);

  const handleSubmit = async (query) => {
    const currentQuestion = query || question;
    if (!currentQuestion.trim()) {
      toast({ title: "Please enter a search query.", status: "warning", duration: 2000, isClosable: true, position: "top" });
      return;
    }

    setLoading(true);
    setAnswer("");
    setSqlQuery("");

    try {
      const eventSource = new EventSource(`http://localhost:8000/stream?question=${encodeURIComponent(currentQuestion)}`);
      let currentAnswer = "";
      let currentSql = "";

      eventSource.onmessage = (event) => {
        try {
          const cleanData = event.data.replace(/^data:\s*/, '');
          if (!cleanData) return;
          const data = JSON.parse(cleanData);
          if (data.type === 'answer') {
            currentAnswer += data.content;
            setAnswer(currentAnswer); 
          } else if (data.type === 'sql') {
            currentSql += data.content;
            setSqlQuery(processSqlChunk(currentSql));
          }
        } catch (parseError) {
          console.error('Parse error:', parseError, 'Raw data:', event.data);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close();
        setLoading(false);
      };

      eventSource.addEventListener('done', () => {
        eventSource.close();
        setLoading(false);
      });

    } catch (error) {
      console.error('Connection error:', error);
      toast({ title: "Connection Error", description: "Could not connect to the server.", status: "error", duration: 5000, isClosable: true, position: "top" });
      setLoading(false);
    }
  };
  
  // --- NEW: Smartly render the response ---
  const renderResponse = () => {
    if (loading && !answer) {
        return <ResultSkeleton />;
    }

    if (!answer) {
        return null;
    }

    // Split the response into parts based on the '---' separator
    const parts = answer.split('---').filter(part => part.trim());
    
    // Find the main title (e.g., "### Flight Options")
    const titlePart = parts.find(p => p.trim().startsWith('#'));
    // Isolate the flight cards
    const flightParts = parts.filter(p => p.includes('✈️'));
    // Isolate the summary
    const summaryPart = parts.find(p => p.includes('**Summary:**'));

    return (
        <VStack spacing={4} align="stretch">
            {titlePart && <Heading as="h3" size="md" color="gray.700" px={1}>{titlePart.replace(/#/g, '').trim()}</Heading>}
            
            {flightParts.map((flightMarkdown, index) => (
                <Card key={index} variant="outline" size="sm">
                    <CardBody>
                        <ReactMarkdown
                            children={flightMarkdown}
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({node, ...props}) => <Text as="div" {...props} />,
                                a: ({node, ...props}) => <Link color='blue.600' fontWeight="bold" isExternal {...props} />,
                                ul: ({node, ...props}) => <Stack as="ul" spacing={2} mt={2} {...props} />,
                                li: ({node, ...props}) => <Box as="li" ml={4} listStyleType="none" {...props} />,
                            }}
                        />
                    </CardBody>
                </Card>
            ))}

            {summaryPart && (
                 <Card variant="outline" size="sm" bg="blue.50">
                    <CardBody>
                        <ReactMarkdown
                            children={summaryPart}
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({node, ...props}) => <Text {...props} />,
                            }}
                        />
                    </CardBody>
                </Card>
            )}
        </VStack>
    );
  };


  return (
    <Box bg="gray.50" minH="100vh">
      <VStack spacing={4} align="stretch" p={3} pb={8}>
        
        <Box textAlign="center" pt={2}>
          <Heading as="h1" size="lg" color="gray.700">
            Flight Search AI
          </Heading>
        </Box>

        <Box position="sticky" top={3} zIndex={10}>
          <Card shadow="md">
            <CardBody p={2}>
              <Flex>
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., 'Delhi to Hanoi'"
                  size="lg"
                  variant="filled"
                  borderRightRadius="none"
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                />
                <IconButton
                  aria-label="Search flights"
                  icon={<SearchIcon />}
                  colorScheme="blue"
                  size="lg"
                  borderLeftRadius="none"
                  onClick={() => handleSubmit()}
                  isLoading={loading}
                />
              </Flex>
            </CardBody>
          </Card>
        </Box>
        
        <Wrap spacing={2}>
            {prompts.map((prompt) => (
                <WrapItem key={prompt}>
                    <Button
                        size="sm"
                        variant="outline"
                        colorScheme="gray"
                        fontWeight="normal"
                        onClick={() => {
                            setQuestion(prompt);
                            handleSubmit(prompt);
                        }}
                    >
                        {prompt}
                    </Button>
                </WrapItem>
            ))}
        </Wrap>

        <Box ref={resultsContainerRef}>
            {renderResponse()}
        </Box>
        
        {sqlQuery && (
          <Box>
            <Heading as="h3" size="sm" my={3} color="gray.600">
              Generated SQL Query
            </Heading>
            <Card>
              <CardBody p={0}>
                <Box bg="gray.800" p={3} borderRadius="md" overflowX="auto">
                  <SyntaxHighlighter language="sql" style={atomDark} customStyle={{fontSize: '0.8em', background: 'transparent'}}>
                    {sqlQuery}
                  </SyntaxHighlighter>
                </Box>
              </CardBody>
            </Card>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default App;
