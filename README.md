HopJS WebScale
==============

This is an extension for hopjs which is intented to allow HopJS to support
applications requiring large horizontal scalability. 

It works by providing a number of components:

 * API Registry service
 * Front end proxy/w session support
 * UI Resource centralization

These services allow for a single application to be composed of a number
of descrete services which appear to be a single application, allowing for
a horizontably scalable application to be built. 

For example, lets imagine we wanted to create a complex web application
for a large organization consisting of a single web presence. Many development
groups may be present with different schedules and delieveralbe dates, our goal
is to allow these groups to provide a highly scalable web presences without 
having to tightly couple release schedules or specifications. 


## API Registry Service

By utilizing the API registry service individual HopJS 
enabled applciations may register themselves and find 
other applications. 

Features
 * API registration
 * API lookup
 * Staged roll out of APIs and components

## Front end proxy

The front end proxy provides a hook for express that
allows applications to utilize a single front end
and proxy HTTP request to subordinate services

Features
 * Forward all HTTP rooted at a path
 * Forward absolute URLs
 
## UI Resource centralization

(To Be Implemented)
 
The UI resource centralization allows
UI resources within express to be centralized
with-in a network of services. Essentially
it creates a means by which: 

 * layouts
 * links and resources

are shared amongst a network of services
